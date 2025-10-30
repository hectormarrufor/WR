// app/api/gestionMantenimiento/grupos/[id]/route.js
import { NextResponse } from 'next/server';
import { Grupo } from '@/models';
import sequelize from '@/sequelize';
import { propagateFrom } from '../../helpers/propagate';


// La función GET para obtener un grupo no necesita cambios.
// (Puede mantener la versión de la respuesta anterior)
async function getGrupoCompleto(id) {
    const grupo = await Grupo.findByPk(id);
    if (!grupo) return null;
    const definicion = grupo.definicion;
    const definicionProcesada = {};
    for (const key in definicion) {
        const attr = definicion[key];
        definicionProcesada[key] = { ...attr };
        if (attr.dataType === 'grupo' && attr.refId) {
            definicionProcesada[key].subGrupo = await getGrupoCompleto(attr.refId);
        } else if (attr.dataType === 'object' && attr.definicion) {
             const nestedResult = await processObjectDefinition(attr.definicion);
             definicionProcesada[key].definicion = nestedResult;
        }
    }
    async function processObjectDefinition(def) {
        const result = {};
        for(const key in def){
            const attr = def[key];
            result[key] = { ...attr };
            if (attr.dataType === 'grupo' && attr.refId) {
                result[key].subGrupo = await getGrupoCompleto(attr.refId);
            } else if (attr.dataType === 'object' && attr.definicion) {
                result[key].definicion = await processObjectDefinition(attr.definicion);
            }
        }
        return result;
    }
    grupo.definicion = definicionProcesada;
    return grupo.toJSON();
}

export async function GET(request, { params }) {
    const { id } = await params;
    
    try {
        const grupoCompleto = await getGrupoCompleto(id);
        if (!grupoCompleto) {
            return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
        }
        return NextResponse.json(grupoCompleto);
    } catch (error) {
        console.error('Error al obtener el grupo:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
  const t = await sequelize.transaction();
  try {
    const body = await request.json();
    const { id } = await params;
    const grupoId = id;

    // Lógica existente de actualización/recreación de subgrupos
    await Grupo.destroy({ where: { parentId: grupoId }, transaction: t });

    const definicionFinal = { ...body.definicion };

    const crearGrupoRecursivo = async (grupoData, parentId, transaction) => {
      const { nombre, definicion, subGrupos } = grupoData;
      const nuevoGrupo = await Grupo.create({ nombre, parentId, definicion: {} }, { transaction });
      const defFinal = { ...definicion };

      if (subGrupos && subGrupos.length > 0) {
        for (const sub of subGrupos) {
          const creado = await crearGrupoRecursivo(sub, nuevoGrupo.id, transaction);
          const attrId = Object.keys(defFinal).find(k => defFinal[k].tempKey === sub.tempKey);
          if (attrId) {
            defFinal[attrId].refId = creado.id;
            delete defFinal[attrId].tempKey;
          }
        }
      }

      await nuevoGrupo.update({ definicion: defFinal }, { transaction });
      return nuevoGrupo;
    };

    if (body.subGrupos && body.subGrupos.length > 0) {
      for (const subGrupoData of body.subGrupos) {
        const subGrupoCreado = await crearGrupoRecursivo(subGrupoData, grupoId, t);
        const atributoIdOriginal = Object.keys(definicionFinal).find(key => definicionFinal[key].tempKey === subGrupoData.tempKey);
        if (atributoIdOriginal) {
          definicionFinal[atributoIdOriginal].refId = subGrupoCreado.id;
          delete definicionFinal[atributoIdOriginal].tempKey;
        }
      }
    }
    console.log("Definición final para el grupo principal:", JSON.stringify(definicionFinal, null, 2));

    await Grupo.update(
      { nombre: body.nombre, definicion: definicionFinal },
      { where: { id: grupoId }, transaction: t }
    );

    await t.commit();

    // Propagar cambios en cascada (no bloquear la respuesta si falla la propagación)
    try {
      await propagateFrom('grupo', grupoId, { removeMissing: true, sequelizeOverride: sequelize });
      console.log('Propagación de cambios desde grupo completada.');
    } catch (propErr) {
      console.error('Error propagando cambios desde grupo:', propErr);
      // No revertimos la actualización principal; registramos el error para revisión.
    }

    return NextResponse.json({ message: 'Grupo actualizado exitosamente' });
  } catch (error) {
    await t.rollback();
    console.error('Error al actualizar el grupo:', error);
    const detail = error.parent?.detail || 'Un nombre de grupo ya existe.';
    return NextResponse.json({ error: `Conflicto: ${detail}`, details: error.message }, { status: 500 });
  }
}


export async function DELETE(request, { params }) {
    const { id } = await params;
    const t = await sequelize.transaction();
    try {
        // Primero, eliminamos todos los subgrupos relacionados
        await Grupo.destroy({ where: { parentId: id }, transaction: t });
        
        // Luego, eliminamos el grupo principal
        const deletedCount = await Grupo.destroy({ where: { id }, transaction: t });
        
        if (deletedCount === 0) {
            return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
        }
        
        await t.commit();
        return NextResponse.json({ message: 'Grupo eliminado exitosamente' });
    } catch (error) {
        await t.rollback();
        console.error('Error al eliminar el grupo:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}