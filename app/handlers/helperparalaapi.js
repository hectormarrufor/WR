const { QueryTypes } = require('sequelize');
const sequelize = require('../../sequelize');
const { Grupo, Categoria, Modelo, Activo, CategoriaGrupos } = require('../../models/gestionMantenimiento');

function buildTemplate(obj) {
  if (obj === null || obj === undefined) return null;
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

function mergeDefaults(target, defaults) {
  if (defaults === null || defaults === undefined) return target ?? defaults;
  if (target === null || target === undefined) return JSON.parse(JSON.stringify(defaults));
  if (Array.isArray(defaults)) return target; // no merge arrays; keep existing
  if (typeof defaults !== 'object' || typeof target !== 'object') return target ?? defaults;
  const out = { ...target };
  for (const k of Object.keys(defaults)) {
    if (!(k in out) || out[k] === null || out[k] === undefined) {
      out[k] = defaults[k];
    } else {
      // both exist and are objects -> recurse
      if (typeof out[k] === 'object' && typeof defaults[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = mergeDefaults(out[k], defaults[k]);
      }
      // otherwise keep existing scalar or array
    }
  }
  return out;
}

async function getSubGroupIds(rootId) {
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

async function propagateGrupoDefinicion(grupoId, options = { removeMissing: false }) {
  return sequelize.transaction(async (t) => {
    const grupo = await Grupo.findByPk(grupoId, { transaction: t });
    if (!grupo) throw new Error('Grupo no encontrado');

    const groupDef = grupo.definicion || {};
    const template = buildTemplate(groupDef);

    const subGroupIds = await getSubGroupIds(grupoId);

    // Categorias relacionadas a esos grupos
    const catGrupos = await CategoriaGrupos.findAll({
      where: { grupoId: subGroupIds },
      transaction: t
    });
    const categoriaIds = [...new Set(catGrupos.map(cg => cg.categoriaId))];
    if (categoriaIds.length === 0) return { updated: 0 };

    // Traer categorías
    const categorias = await Categoria.findAll({
      where: { id: categoriaIds },
      transaction: t
    });

    let totalUpdated = 0;

    // Actualizar cada categoría
    for (const categoria of categorias) {
      const current = categoria.definicion || {};
      const merged = mergeDefaults(current, template);
      // Si options.removeMissing === true, sincronizar: eliminar claves que no existan en template
      let final = merged;
      if (options.removeMissing) {
        final = Object.keys(merged).reduce((acc, k) => {
          if (template && (k in template)) acc[k] = merged[k];
          return acc;
        }, {});
      }
      const changed = JSON.stringify(final) !== JSON.stringify(current);
      if (changed) {
        await categoria.update({ definicion: final }, { transaction: t });
        totalUpdated++;
      }
    }

    // Modelos de esas categorias
    const modelos = await Modelo.findAll({
      where: { categoriaId: categoriaIds },
      transaction: t
    });

    for (const modelo of modelos) {
      const cur = modelo.especificaciones || {};
      const merged = mergeDefaults(cur, template);
      const final = options.removeMissing
        ? Object.keys(merged).reduce((acc, k) => { if (template && (k in template)) acc[k] = merged[k]; return acc; }, {})
        : merged;
      if (JSON.stringify(final) !== JSON.stringify(cur)) {
        await modelo.update({ especificaciones: final }, { transaction: t });
        totalUpdated++;
      }
    }

    // Activos de esos modelos
    const modeloIds = modelos.map(m => m.id);
    if (modeloIds.length) {
      const activos = await Activo.findAll({
        where: { modeloId: modeloIds },
        transaction: t
      });
      for (const activo of activos) {
        const cur = activo.datosPersonalizados || {};
        const merged = mergeDefaults(cur, template);
        const final = options.removeMissing
          ? Object.keys(merged).reduce((acc, k) => { if (template && (k in template)) acc[k] = merged[k]; return acc; }, {})
          : merged;
        if (JSON.stringify(final) !== JSON.stringify(cur)) {
          await activo.update({ datosPersonalizados: final }, { transaction: t });
          totalUpdated++;
        }
      }
    }

    return { updated: totalUpdated };
  });
}