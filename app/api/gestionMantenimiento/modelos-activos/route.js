// En tu archivo de rutas para modelos, por ej: app/api/gestionMantenimiento/modelos/route.js

import db from '@/models'; // Asegúrate que tu alias @ apunta a la raíz del proyecto
import { NextResponse } from 'next/server';

/**
 * Función recursiva para procesar la definición de un modelo y crear los sub-modelos anidados.
 * @param {object} especificaciones - El objeto de especificaciones del modelo.
 * @param {number} categoriaId - El ID de la categoría del modelo.
 * @param {object} transaction - La transacción de Sequelize.
 * @returns {Promise<object>} - El objeto de especificaciones procesado para guardar en DB.
 */
async function procesarDefinicionParaGuardar(especificaciones, categoriaId, transaction) {
    const especificacionesProcesadas = {};

    for (const key in especificaciones) {
        if (Object.prototype.hasOwnProperty.call(especificaciones, key)) {
            const atributo = { ...especificaciones[key] };

            // Si es un atributo de tipo 'grupo' en modo 'define', creamos un nuevo modelo para él
            if (atributo.dataType === 'grupo' && atributo.mode === 'define' && atributo.subGrupo) {
                const nombreSubModelo = atributo.subGrupo.nombre;

                // Buscamos si ya existe un modelo con ese nombre para evitar duplicados
                let subModelo = await db.Modelo.findOne({
                    where: { nombre: nombreSubModelo },
                    transaction
                });

                if (!subModelo) {
                    const subEspecificacionesProcesadas = await procesarDefinicionParaGuardar(atributo.subGrupo.definicion, categoriaId, transaction);
                    subModelo = await db.Modelo.create({
                        nombre: nombreSubModelo,
                        categoriaId, // Asignamos la misma categoría del padre
                        especificaciones: subEspecificacionesProcesadas,
                    }, { transaction });
                }

                // Reemplazamos el objeto anidado por una referencia al nuevo modelo
                atributo.refId = subModelo.id;
                atributo.mode = 'select';
                delete atributo.subGrupo;
            }

            // Procesamos la definición anidada si es un objeto
            if (atributo.dataType === 'object' && atributo.definicion) {
                atributo.definicion = await procesarDefinicionParaGuardar(atributo.definicion, categoriaId, transaction);
            }
            
            // Eliminamos propiedades temporales como 'key'
            delete atributo.key;
            especificacionesProcesadas[key] = atributo;
        }
    }
    return especificacionesProcesadas;
}

export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { nombre, categoriaId, definicion } = body;

        const especificacionesProcesadas = await procesarDefinicionParaGuardar(definicion, categoriaId, transaction);

        const nuevoModelo = await db.Modelo.create({
            nombre,
            categoriaId,
            especificaciones: especificacionesProcesadas,
        }, { transaction });

        await transaction.commit();
        
        return NextResponse.json(nuevoModelo, { status: 201 });
    } catch (error) {
        await transaction.rollback();
        console.error("Error al crear el modelo:", error);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}
export async function GET(request) {
    try {
        // Obtenemos todos los modelos.
        // Incluimos la 'categoria' a la que pertenece cada modelo para mostrar más información.
        const modelos = await db.Modelo.findAll({
            include: [{
                model: db.Categoria,
                as: 'categoria',
                attributes: ['id', 'nombre'] // Solo traemos los datos necesarios de la categoría
            }],
            order: [['nombre', 'ASC']] // Ordenamos alfabéticamente
        });
        
        return NextResponse.json(modelos);

    } catch (error) {
        console.error('Error al obtener los modelos:', error);
        return NextResponse.json({
            message: 'Error al obtener los modelos',
            error: error.message
        }, { status: 500 });
    }
}