// app/api/gestionMantenimiento/grupos/[id]/route.js
import { NextResponse } from 'next/server';
import { Grupo } from '@/models';
import sequelize from '@/sequelize';

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
    try {
        const grupoCompleto = await getGrupoCompleto(params.id);
        if (!grupoCompleto) {
            return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
        }
        return NextResponse.json(grupoCompleto);
    } catch (error) {
        console.error('Error al obtener el grupo:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

// --- LÓGICA DE ACTUALIZACIÓN (PUT) CORREGIDA ---
export async function PUT(request, { params }) {
    const t = await sequelize.transaction();
    try {
        const body = await request.json();
        const grupoId = params.id;

        // Estrategia: Destruir hijos viejos y recrear la estructura.
        // Es más simple y seguro que una comparación compleja.
        await Grupo.destroy({ where: { parentId: grupoId }, transaction: t });

        const definicionFinal = { ...body.definicion };

        // Re-usamos la misma lógica robusta de creación del POST
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
                // Creamos los nuevos sub-grupos, asignando el parentId del grupo que se está editando
                const subGrupoCreado = await crearGrupoRecursivo(subGrupoData, grupoId, t);
                
                const atributoIdOriginal = Object.keys(definicionFinal).find(key => definicionFinal[key].tempKey === subGrupoData.tempKey);
                if (atributoIdOriginal) {
                    definicionFinal[atributoIdOriginal].refId = subGrupoCreado.id;
                    delete definicionFinal[atributoIdOriginal].tempKey;
                }
            }
        }
        
        // Actualizamos el grupo principal con el nuevo nombre y la definición final
        await Grupo.update(
            { nombre: body.nombre, definicion: definicionFinal },
            { where: { id: grupoId }, transaction: t }
        );

        await t.commit();
        return NextResponse.json({ message: 'Grupo actualizado exitosamente' });

    } catch (error) {
        await t.rollback();
        console.error('Error al actualizar el grupo:', error);
        const detail = error.parent?.detail || 'Un nombre de grupo ya existe.';
        return NextResponse.json({ error: `Conflicto: ${detail}`, details: error.message }, { status: 500 });
    }
}