// app/lib/propagacion/propagate.js
import { QueryTypes } from 'sequelize';
import sequelize from '@/sequelize';
import { Grupo, Categoria, Modelo, Activo, CategoriaGrupos } from '@/models';

// Normaliza una definicion que puede venir como array o como objeto.
// Resultado: objeto { key: attrObj, ... } listo para merge.
// Filtra placeholders y elimina props UI (key, tempKey).
export function normalizeDefArrayToObject(def) {
  if (!def) return {};
  if (typeof def === 'object' && !Array.isArray(def)) {
    const out = {};
    for (const k of Object.keys(def)) {
      const attr = def[k];
      if (!attr) continue;
      const isEmpty = (attr.id == null && !attr.label && !attr.nombre && !attr.dataType);
      if (isEmpty) continue;

      const copy = { ...attr };
      delete copy.key;
      delete copy.tempKey;

      if (copy.subGrupo && copy.subGrupo.definicion) {
        copy.subGrupo = {
          ...copy.subGrupo,
          definicion: normalizeDefArrayToObject(copy.subGrupo.definicion)
        };
      }

      if (copy.dataType === 'object' && copy.definicion) {
        copy.definicion = normalizeDefArrayToObject(copy.definicion);
      }

      out[k] = copy;
    }
    return out;
  }

  if (Array.isArray(def)) {
    const out = {};
    for (const item of def) {
      if (!item) continue;
      const isEmpty = (item.id == null && !item.label && !item.nombre && !item.dataType);
      if (isEmpty) continue;

      const rawId = item.id || item.label || item.nombre || null;
      const id = rawId
        ? String(rawId).toString().trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w\-]/g, '')
        : `k_${Math.random().toString(36).slice(2, 9)}`;

      const copy = { ...item };
      delete copy.key;
      delete copy.tempKey;

      if (copy.subGrupo && copy.subGrupo.definicion) {
        copy.subGrupo = {
          ...copy.subGrupo,
          definicion: normalizeDefArrayToObject(copy.subGrupo.definicion)
        };
      }
      if (copy.dataType === 'object' && copy.definicion) {
        copy.definicion = normalizeDefArrayToObject(copy.definicion);
      }

      out[id] = copy;
    }
    return out;
  }

  return {};
}

// Merge recursivo: añade claves faltantes desde `defaults` a `target`
// sin sobrescribir valores existentes en `target`. Arrays no se mezclan.
export function mergeDefaults(target, defaults) {
  if (defaults === null || defaults === undefined) return target ?? defaults;
  if (target === null || target === undefined) return JSON.parse(JSON.stringify(defaults));
  if (Array.isArray(defaults)) return target; // no merge arrays
  if (typeof defaults !== 'object' || typeof target !== 'object') return target;

  const out = { ...target };
  for (const k of Object.keys(defaults)) {
    const defaultVal = defaults[k];
    const hasKey = Object.prototype.hasOwnProperty.call(out, k);

    if (!hasKey) {
      out[k] = JSON.parse(JSON.stringify(defaultVal));
      continue;
    }

    const outVal = out[k];

    if (outVal === undefined) {
      out[k] = JSON.parse(JSON.stringify(defaultVal));
      continue;
    }

    if (
      typeof outVal === 'object' && outVal !== null && !Array.isArray(outVal) &&
      typeof defaultVal === 'object' && defaultVal !== null && !Array.isArray(defaultVal)
    ) {
      out[k] = mergeDefaults(outVal, defaultVal);
      continue;
    }

    if (Array.isArray(defaultVal) && Array.isArray(outVal)) {
      out[k] = outVal;
      continue;
    }

    out[k] = outVal;
  }

  return out;
}

// Prune clásico: recorta obj para que sólo tenga las claves presentes en template.
// Si falta una clave, la rellena con el valor del template.
export function pruneToTemplate(obj, template) {
  if (!template || obj === null || typeof obj !== 'object') return obj;
  const out = {};
  for (const k of Object.keys(template)) {
    if (k in obj) {
      if (typeof obj[k] === 'object' && typeof template[k] === 'object' && !Array.isArray(obj[k])) {
        out[k] = pruneToTemplate(obj[k], template[k]);
      } else {
        out[k] = obj[k];
      }
    } else {
      out[k] = template[k];
    }
  }
  return out;
}

// Obtener subárbol de grupos (CTE)
export async function getSubGroupIds(rootId) {
  const rows = await sequelize.query(
    `WITH RECURSIVE sub AS (
       SELECT id FROM "Grupos" WHERE id = :id
     UNION ALL
       SELECT g.id FROM "Grupos" g JOIN sub s ON g."parentId" = s.id
     )
     SELECT id FROM sub;`,
    { replacements: { id: rootId }, type: QueryTypes.SELECT }
  );
  return rows.map(r => r.id);
}

// Construye conjunto de keys desde varias definiciones normalizadas
function buildAllowedKeysFromGroupDefs(groupDefs = []) {
  const keys = new Set();
  for (const def of groupDefs) {
    if (!def || typeof def !== 'object') continue;
    for (const k of Object.keys(def)) keys.add(k);
  }
  return keys;
}

// Prune recursivo basado en allowedKeys (mantiene sólo claves permitidas)
function pruneToAllowedKeys(obj = {}, allowedKeys = new Set()) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const k of Object.keys(obj)) {
    if (!allowedKeys.has(k)) {
      continue;
    }
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const child = pruneToAllowedKeys(v, allowedKeys);
      if (typeof child === 'object' && Object.keys(child).length === 0) {
        // mantener padre vacío o eliminar según preferencia; aquí lo mantenemos si tiene estructura
        out[k] = child;
      } else {
        out[k] = child;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * pruneToTemplateExtended
 * - merged: objeto resultante a revisar.
 * - defaults: definicion actual normalizada del propagador (obj clave->attr).
 * - options:
 *     - removeMissing: boolean
 *     - propagateFromGroupId: id del grupo propagador (opcional)
 *     - categoryId: id de la categoria destino (opcional)
 *     - transaction: sequelize transaction opcional
 *     - oldDef: definicion previa normalizada del propagador (opcional, recomendada)
 *
 * Comportamiento:
 * - Si removeMissing === false -> devuelve merged.
 * - Si removeMissing === true -> elimina solo las keys que:
 *     * estaban en oldDef (si se pasó) o en defaultsPrev,
 *     * ya no están en defaults (fueron eliminadas del propagador),
 *     * y no están presentes en otros grupos asociados a la categoría.
 */
async function pruneToTemplateExtended(merged, defaults, options = {}) {
  const {
    removeMissing = false,
    propagateFromGroupId = null,
    categoryId = null,
    transaction = null,
    oldDef = null, // normalizada
  } = options;

  if (!removeMissing) return merged;

  // si no tenemos propagateFromGroupId/categoryId/oldDef, NO hacemos pruning destructivo.
  // Devolvemos merged tal cual para evitar borrar atributos que podrían pertenecer a otros grupos o haber sido añadidos manualmente.
  if (!propagateFromGroupId || !categoryId || !oldDef) {
    return merged;
  }


  // 1) keys que aportaba el propagador previamente
  const propagatorPrevKeys = new Set(Object.keys(oldDef || {}));
  // 2) keys que aporta ahora el propagador
  const propagatorCurrKeys = new Set(Object.keys(defaults || {}));

  // 3) obtener otros grupos asociados a la categoryId
  const catGrupoRows = await CategoriaGrupos.findAll({
    where: { categoriaId: categoryId },
    transaction
  });
  const allGrupoIds = catGrupoRows.map(r => r.grupoId).filter(Boolean);
  const otherGrupoIds = allGrupoIds.filter(gid => String(gid) !== String(propagateFromGroupId));
  let otherKeys = new Set();
  if (otherGrupoIds.length) {
    const otherGroups = await Grupo.findAll({
      where: { id: otherGrupoIds },
      attributes: ['id', 'definicion'],
      transaction
    });
    const groupDefsNormalized = otherGroups.map(g => normalizeDefArrayToObject(g.definicion || {}));
    otherKeys = buildAllowedKeysFromGroupDefs(groupDefsNormalized);
  }

  // 4) decidir eliminación: eliminar K si estuvo en propagatorPrevKeys, ya no está en propagatorCurrKeys, y no la provee otros grupos
  const final = {};
  for (const k of Object.keys(merged || {})) {
    if (!propagatorPrevKeys.has(k)) {
      final[k] = merged[k];
      continue;
    }
    if (propagatorCurrKeys.has(k)) {
      final[k] = merged[k];
      continue;
    }
    if (otherKeys.has(k)) {
      final[k] = merged[k];
      continue;
    }
    // else -> clave venía del propagador antes, la quitaron, y ningún otro grupo la provee => eliminarla
  }

  return final;
}

/**
 * Función principal de propagación.
 * level: 'grupo' | 'categoria' | 'modelo'
 * id: id del registro origen
 * options: { removeMissing = false, sequelizeOverride = null, oldDef = null (normalizada) }
 */
export async function propagateFrom(level, id, options = {}) {
  const { removeMissing = false, sequelizeOverride = null, oldDef = null } = options;
  const db = sequelizeOverride || sequelize;

  return db.transaction(async (t) => {
    let defaults; // usamos 'defaults' en lugar de 'template'
    let categoriaIds = [];
    let modeloIds = [];

    if (level === 'grupo') {
      const grupo = await Grupo.findByPk(id, { transaction: t });
      if (!grupo) throw new Error('Grupo no encontrado');

      // Normalizar definicion del grupo; usarla directamente como defaults
      console.log('[propagate] grupo raw definicion:', JSON.stringify(grupo.definicion, null, 2));
      defaults = normalizeDefArrayToObject(grupo.definicion || {});
      console.log('[propagate] defaults (normalizedGrupoDef):', JSON.stringify(defaults, null, 2));

      const subIds = await getSubGroupIds(id);
      const catGrupos = await CategoriaGrupos.findAll({
        where: { grupoId: subIds },
        transaction: t
      });
      categoriaIds = [...new Set(catGrupos.map(x => x.categoriaId))];
    }

    if (level === 'categoria') {
      const categoria = await Categoria.findByPk(id, { transaction: t });
      if (!categoria) throw new Error('Categoria no encontrada');

      defaults = normalizeDefArrayToObject(categoria.definicion || {});
      categoriaIds = [id];
    }

    if (level === 'modelo') {
      const modelo = await Modelo.findByPk(id, { transaction: t });
      if (!modelo) throw new Error('Modelo no encontrado');

      const modelDefRaw = modelo.definicion ?? modelo.especificaciones ?? {};
      defaults = normalizeDefArrayToObject(modelDefRaw);
      modeloIds = [id];
    }

    // si partimos de categoria y modeloIds aún está vacío, traer modelos
    if (categoriaIds.length && modeloIds.length === 0) {
      const modelos = await Modelo.findAll({ where: { categoriaId: categoriaIds }, transaction: t });
      modeloIds = modelos.map(m => m.id);
    }

    // actualizar categorias (si aplica)
    if (defaults && categoriaIds.length) {
      const categorias = await Categoria.findAll({ where: { id: categoriaIds }, transaction: t });

      // prefetch CategoriaGrupos y Grupos asociados para evitar N+1 al calcular old/other keys later (optimización)
      const allCatIds = categorias.map(c => c.id);
      const allCatGrupoRows = await CategoriaGrupos.findAll({ where: { categoriaId: allCatIds }, transaction: t });
      const grupoIdsSet = new Set(allCatGrupoRows.map(r => r.grupoId));
      const grupoIdsArr = Array.from(grupoIdsSet).filter(Boolean);
      const gruposAll = grupoIdsArr.length ? await Grupo.findAll({ where: { id: grupoIdsArr }, attributes: ['id', 'definicion'], transaction: t }) : [];

      // indexar grupos por id para acceso rápido
      const gruposById = {};
      for (const g of gruposAll) gruposById[g.id] = normalizeDefArrayToObject(g.definicion || {});

      for (const cat of categorias) {
        const curRaw = cat.definicion || {};
        const cur = normalizeDefArrayToObject(curRaw);
        const merged = mergeDefaults(cur, defaults);

        // calcular oldDefNormalized si no viene y necesitamos removeMissing: intentar obtener oldDef de gruposAll si propagation viene de group
        let oldDefNormalized = null;
        if (oldDef && typeof oldDef === 'object') {
          oldDefNormalized = oldDef;
        } else if (options.oldDef && typeof options.oldDef === 'object') {
          oldDefNormalized = options.oldDef;
        } else {
          // si estamos propagando desde un grupo y tenemos gruposById, intentar obtener prev def del propagator desde DB no es trivial aquí;
          // asumimos caller pasó oldDef. Si no se pasó, pruneToTemplateExtended caerá en fallback conservador.
        }
        

        const final = await pruneToTemplateExtended(merged, defaults, {
          removeMissing,
          propagateFromGroupId: level === 'grupo' ? id : null,
          categoryId: cat.id,
          transaction: t,
          oldDef: oldDefNormalized
        });

        if (JSON.stringify(final) !== JSON.stringify(cur)) {
          await cat.update({ definicion: final }, { transaction: t });
        }
      }
    }

    // actualizar modelos
    if (defaults && modeloIds.length) {
      const modelos = await Modelo.findAll({ where: { id: modeloIds }, transaction: t });
      for (const mod of modelos) {
        const curRaw = mod.definicion ?? mod.especificaciones ?? {};
        const cur = normalizeDefArrayToObject(curRaw);
        const merged = mergeDefaults(cur, defaults);

        let oldDefNormalized = null;
        if (oldDef && typeof oldDef === 'object') oldDefNormalized = oldDef;
        else if (options.oldDef && typeof options.oldDef === 'object') oldDefNormalized = options.oldDef;

        const categoryIdForModel = mod.categoriaId ?? null;
        const final = await pruneToTemplateExtended(merged, defaults, {
          removeMissing,
          propagateFromGroupId: level === 'grupo' ? id : null,
          categoryId: categoryIdForModel,
          transaction: t,
          oldDef: oldDefNormalized
        });

        if (JSON.stringify(final) !== JSON.stringify(cur)) {
          const payload = {};
          if ('definicion' in mod) payload.definicion = final;
          else payload.especificaciones = final;
          await mod.update(payload, { transaction: t });
        }
      }
    }

    // actualizar activos de esos modelos
    if (defaults && modeloIds.length) {
      const activos = await Activo.findAll({ where: { modeloId: modeloIds }, transaction: t });
      for (const activo of activos) {
        const curRaw = activo.definicion ?? activo.datosPersonalizados ?? {};
        const cur = normalizeDefArrayToObject(curRaw);
        const merged = mergeDefaults(cur, defaults);

        let oldDefNormalized = null;
        if (oldDef && typeof oldDef === 'object') oldDefNormalized = oldDef;
        else if (options.oldDef && typeof options.oldDef === 'object') oldDefNormalized = options.oldDef;

        // derivar categoryId desde el modelo si existe
        let categoryIdForActivo = null;
        if (activo.modeloId) {
          const modelo = await Modelo.findByPk(activo.modeloId, { transaction: t });
          categoryIdForActivo = modelo ? modelo.categoriaId : null;
        }

        const final = await pruneToTemplateExtended(merged, defaults, {
          removeMissing,
          propagateFromGroupId: level === 'grupo' ? id : null,
          categoryId: categoryIdForActivo,
          transaction: t,
          oldDef: oldDefNormalized
        });

        if (JSON.stringify(final) !== JSON.stringify(cur)) {
          const payload = {};
          if ('definicion' in activo) payload.definicion = final;
          else payload.datosPersonalizados = final;
          await activo.update(payload, { transaction: t });
        }
      }
    }

    return { ok: true };
  });
}