// src/app/api/gestionMantenimiento/grupos/import/route.js

import { NextResponse } from 'next/server';
import db from '@/models';

/**
 * Función auxiliar para procesar definiciones de objetos anidados (no de grupos).
 * @param {object} definicion - El objeto de definición de atributos anidados.
 * @param {object} transaction - La transacción de Sequelize.
 * @returns {Promise<object>} La definición procesada.
 */
async function processNestedObjectDefinition(definicion, transaction) {
    const processed = {};
    for (const key in definicion) {
        if (Object.prototype.hasOwnProperty.call(definicion, key)) {
            const atributo = { ...definicion[key] };
            if (atributo.dataType === 'object' && atributo.definicion) {
                atributo.definicion = await processNestedObjectDefinition(atributo.definicion, transaction);
            }
            processed[key] = atributo;
        }
    }
    return processed;
}

/**
 * Función principal para importar un grupo, incluyendo la creación de sus subgrupos anidados.
 * @param {object} grupoData - El objeto JSON del grupo a importar.
 * @param {object} transaction - La transacción de Sequelize.
 * @returns {Promise<object>} El objeto del grupo creado en la base de datos.
 */
async function importarGrupoCompleto(grupoData, transaction) {
    const { nombre, definicion, subGrupos, relaciones } = grupoData;
    const oldToNewIdMap = new Map();

    // 1. FASE 1: Crear todos los subgrupos y mapear sus IDs
    if (subGrupos && subGrupos.length > 0) {
        for (const subGrupo of subGrupos) {
            const nuevoSubGrupo = await db.Grupo.create({
                nombre: subGrupo.nombre,
                definicion: await processNestedObjectDefinition(subGrupo.definicion, transaction)
            }, { transaction });
            oldToNewIdMap.set(subGrupo.id, nuevoSubGrupo.id);
        }
    }

    // 2. FASE 2: Procesar la definición del grupo principal y actualizar las referencias
    const definicionFinal = {};
    for (const key in definicion) {
        if (Object.prototype.hasOwnProperty.call(definicion, key)) {
            const atributo = { ...definicion[key] };

            // Si es un atributo de tipo grupo, usamos el mapa de relaciones para actualizar el refId
            if (atributo.dataType === 'grupo' && relaciones) {
                const relacion = relaciones.find(r => r.atributoId === atributo.id);
                if (relacion) {
                    const nuevoRefId = oldToNewIdMap.get(relacion.subGrupoOriginalId);
                    if (!nuevoRefId) {
                        throw new Error(`Referencia a subgrupo con ID original ${relacion.subGrupoOriginalId} no encontrada.`);
                    }
                    atributo.refId = nuevoRefId;
                    atributo.subGrupo = null;
                    atributo.mode = 'select';
                }
            }

            // Procesamos la definición anidada si es un objeto
            if (atributo.dataType === 'object' && atributo.definicion) {
                atributo.definicion = await processNestedObjectDefinition(atributo.definicion, transaction);
            }

            definicionFinal[key] = atributo;
        }
    }

    // 3. FASE 3: Crear el grupo principal con las referencias ya resueltas
    const nuevoGrupoPrincipal = await db.Grupo.create({
        nombre,
        definicion: definicionFinal,
    }, { transaction });

    return nuevoGrupoPrincipal;
}


export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();

        if (!body.nombre || !body.definicion) {
            throw new Error("El archivo JSON no tiene el formato de grupo esperado.");
        }

        const nuevoGrupo = await importarGrupoCompleto(body, transaction);
        
        await transaction.commit();

        return NextResponse.json({
            message: `Grupo "${nuevoGrupo.nombre}" importado exitosamente con ID ${nuevoGrupo.id}.`,
        }, { status: 201 });

    } catch (error) {
        await transaction.rollback();
        console.error("Error al importar el grupo:", error);
        return NextResponse.json({ message: error.message || 'Error desconocido al importar el grupo.' }, { status: 400 });
    }
}