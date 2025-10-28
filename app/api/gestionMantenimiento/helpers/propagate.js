// app/lib/propagacion/propagate.js
import { QueryTypes } from 'sequelize';
import  sequelize  from '@/sequelize'; // ajusta si tu instancia está en otra ruta
import {Grupo, Categoria, Modelo, Activo, CategoriaGrupos} from '@/models';

/**
 * Crea una plantilla (template) con las mismas claves que `obj`
 * pero con valores vacíos: null para escalares, {} para objetos, [] para arrays.
 */
export function buildTemplate(obj) {
  if (obj === null || obj === undefined) return {};
  if (Array.isArray(obj)) return [];
  if (typeof obj !== 'object') return null;
  const out = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === null || v === undefined) {
      out[k] = null;
    } else if (Array.isArray(v)) {
      out[k] = [];
    } else if (typeof v === 'object') {
      out[k] = buildTemplate(v);
    } else {
      out[k] = null;
    }
  }
  return out;
}

/**
 * Merge recursivo: añade claves faltantes desde `defaults` a `target`
 * sin sobrescribir valores no nulos existentes en `target`.
 * Arrays no se mezclan, se preservan los existentes.
 */
export function mergeDefaults(target, defaults) {
  if (defaults === null || defaults === undefined) return target ?? defaults;
  if (target === null || target === undefined) return JSON.parse(JSON.stringify(defaults));
  if (Array.isArray(defaults)) return target; // no merge arrays
  if (typeof defaults !== 'object' || typeof target !== 'object') return target ?? defaults;

  const out = { ...target };
  for (const k of Object.keys(defaults)) {
    if (!(k in out) || out[k] === null || out[k] === undefined) {
      out[k] = defaults[k];
    } else {
      if (typeof out[k] === 'object' && typeof defaults[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = mergeDefaults(out[k], defaults[k]);
      }
      // si es array o escalar, dejamos el valor existente
    }
  }
  return out;
}

/**
 * Prune: recorta obj para que solo tenga las claves presentes en template.
 * Si falta una clave, la rellena con el valor del template.
 */
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

/**
 * Obtiene todos los ids del subárbol de grupos (incluye el rootId).
 * Usa CTE recursivo en PostgreSQL.
 */
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

/**
 * Función principal de propagación.
 * level: 'grupo' | 'categoria' | 'modelo'
 * id: id del registro origen
 * options: { removeMissing = false, sequelizeOverride } - si pasas sequelizeOverride usa esa instancia
 */
export async function propagateFrom(level, id, options = {}) {
  const { removeMissing = false, sequelizeOverride = null } = options;
  const db = sequelizeOverride || sequelize;

  return db.transaction(async (t) => {
    let template;
    let categoriaIds = [];
    let modeloIds = [];

    if (level === 'grupo') {
      const grupo = await Grupo.findByPk(id, { transaction: t });
      if (!grupo) throw new Error('Grupo no encontrado');
      template = buildTemplate(grupo.definicion || {});
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
      template = buildTemplate(categoria.definicion || {});
      categoriaIds = [id];
    }

    if (level === 'modelo') {
      const modelo = await Modelo.findByPk(id, { transaction: t });
      if (!modelo) throw new Error('Modelo no encontrado');
      // el modelo puede usar la misma propiedad `definicion` según tu migración; si usa especificaciones ajusta aquí
      template = buildTemplate(modelo.definicion || modelo.especificaciones || {});
      modeloIds = [id];
    }

    // si partimos de categoria y modeloIds aún está vacío, traer modelos
    if (categoriaIds.length && modeloIds.length === 0) {
      const modelos = await Modelo.findAll({ where: { categoriaId: categoriaIds }, transaction: t });
      modeloIds = modelos.map(m => m.id);
    }

    // actualizar categorias (si aplica)
    if (template && categoriaIds.length) {
      const categorias = await Categoria.findAll({ where: { id: categoriaIds }, transaction: t });
      for (const cat of categorias) {
        const cur = cat.definicion || {};
        const merged = mergeDefaults(cur, template);
        const final = removeMissing ? pruneToTemplate(merged, template) : merged;
        if (JSON.stringify(final) !== JSON.stringify(cur)) {
          await cat.update({ definicion: final }, { transaction: t });
        }
      }
    }

    // actualizar modelos
    if (template && modeloIds.length) {
      const modelos = await Modelo.findAll({ where: { id: modeloIds }, transaction: t });
      for (const mod of modelos) {
        const cur = mod.definicion ?? mod.especificaciones ?? {};
        const merged = mergeDefaults(cur, template);
        const final = removeMissing ? pruneToTemplate(merged, template) : merged;
        // escribir en la propiedad que uses para modelo; aquí priorizamos `definicion`
        if (JSON.stringify(final) !== JSON.stringify(cur)) {
          const payload = {};
          if ('definicion' in mod) payload.definicion = final;
          else payload.especificaciones = final;
          await mod.update(payload, { transaction: t });
        }
      }
    }

    // actualizar activos de esos modelos
    if (template && modeloIds.length) {
      const activos = await Activo.findAll({ where: { modeloId: modeloIds }, transaction: t });
      for (const activo of activos) {
        const cur = activo.definicion ?? activo.datosPersonalizados ?? {};
        const merged = mergeDefaults(cur, template);
        const final = removeMissing ? pruneToTemplate(merged, template) : merged;
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