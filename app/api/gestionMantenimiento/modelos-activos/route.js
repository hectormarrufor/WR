// En tu archivo de rutas para modelos, por ej: app/api/gestionMantenimiento/modelos/route.js

import db from '@/models'; // Asegúrate que tu alias @ apunta a la raíz del proyecto
import { NextResponse } from 'next/server';

/**
 * Función recursiva para crear un modelo (componente o ensamblaje).
 * @param {object} modeloData - Los datos del modelo a crear { nombre, especificaciones }.
 * @param {number} categoriaId - El ID de la categoría a la que pertenece este modelo.
 * @param {import('sequelize').Transaction} transaction - La transacción de Sequelize.
 * @returns {Promise<object>} - La instancia del modelo creado.
 */
async function crearModeloRecursivo(modeloData, categoriaId, transaction) {
    const { nombre, especificaciones } = modeloData;

    // 1. Limpiamos las especificaciones para la BD, convirtiendo el array en un objeto JSONB.
    const especificacionesParaGuardar = especificaciones.reduce((acc, attr) => {
        const { key, ...rest } = attr; // Excluimos la 'key' del frontend
        acc[rest.id] = rest;
        return acc;
    }, {});

    // 2. Crear el modelo actual (ej: "Kaiceng" o "Motor Kaiceng").
    const nuevoModelo = await db.Modelo.create({
        nombre: nombre,
        categoriaId: categoriaId,
        especificaciones: especificacionesParaGuardar, // Guardamos una versión inicial
    }, { transaction });

    // 3. Iteramos para encontrar y crear los modelos componentes (sub-modelos).
    for (const attrId in especificacionesParaGuardar) {
        const atributo = especificacionesParaGuardar[attrId];

        // Si el atributo es un 'grupo', significa que es un modelo componente a crear.
        if (atributo.dataType === 'grupo' && atributo.subGrupo) {
            
            // El 'refId' del atributo es el ID de la CATEGORÍA del componente.
            const componenteCategoriaId = atributo.refId;

            // Llamada recursiva para crear el modelo componente.
            const componenteCreado = await crearModeloRecursivo(
                {
                    nombre: atributo.subGrupo.nombre, // ej: "Motor Kaiceng"
                    especificaciones: atributo.subGrupo.definicion,
                },
                componenteCategoriaId, // La categoría a la que pertenece el motor
                transaction
            );
            
            // ✨ ¡Lógica Clave! Actualizamos el 'refId' en las especificaciones del ensamblaje
            // para que apunte al ID del MODELO componente recién creado.
            especificacionesParaGuardar[attrId].refId = componenteCreado.id;
            
            // Limpiamos los datos del sub-grupo que ya no son necesarios en el JSON final.
            delete especificacionesParaGuardar[attrId].subGrupo;
            delete especificacionesParaGuardar[attrId].mode;
        }
    }

    // 4. Actualizamos el modelo actual con las especificaciones finales.
    await nuevoModelo.update({ especificaciones: especificacionesParaGuardar }, { transaction });

    return nuevoModelo;
}

// --- Ruta POST ---

export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { nombre, categoriaId, especificaciones } = body;

        if (!nombre || !categoriaId) {
            return NextResponse.json({ message: 'El nombre y la categoría son requeridos.' }, { status: 400 });
        }

        // Inicia el proceso de creación recursiva para el modelo principal.
        const modeloPrincipal = await crearModeloRecursivo(
            { nombre, especificaciones },
            categoriaId,
            transaction
        );

        // Si todo fue exitoso, confirma la transacción.
        await transaction.commit();

        // Devuelve el modelo principal creado.
        const result = await db.Modelo.findByPk(modeloPrincipal.id, {
            include: [
                { model: db.Categoria, as: 'categoria' },
                // Puedes incluir los componentes si lo necesitas, pero la especificación ya tiene los IDs.
                // { model: db.Modelo, as: 'componentes' }
            ]
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        // Si algo falla, revierte todos los cambios.
        await transaction.rollback();
        console.error('Error al crear el modelo:', error);
        return NextResponse.json({
            message: 'Error al crear el modelo',
            error: error.message,
            stack: error.stack
        }, { status: 500 });
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