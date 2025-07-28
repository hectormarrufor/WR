import db from '@/models';
import { NextResponse } from 'next/server';

/**
 * GET para obtener una lista de todos los activos.
 */
export async function GET(request) {
    try {
        const activos = await db.Activo.findAll({
            include: [{
                model: db.Modelo,
                as: 'modelo',
                attributes: ['id', 'nombre'],
                // Incluimos la categoría del modelo para tener más contexto en la lista
                include: [{
                    model: db.Categoria,
                    as: 'categoria',
                    attributes: ['id', 'nombre']
                }]
            }],
            order: [['codigoActivo', 'ASC']]
        });
        return NextResponse.json(activos);
    } catch (error) {
        console.error('Error al obtener los activos:', error);
        return NextResponse.json({ message: 'Error al obtener los activos', error: error.message }, { status: 500 });
    }
}

/**
 * POST para crear un nuevo activo.
 */
export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { modeloId, codigoActivo, datosPersonalizados } = body;

        if (!modeloId || !codigoActivo) {
            return NextResponse.json({ message: 'El modelo y el código de activo son requeridos.' }, { status: 400 });
        }

        // Creamos el nuevo activo con los datos del formulario
        const nuevoActivo = await db.Activo.create({
            modeloId,
            codigoActivo,
            datosPersonalizados,
            // Puedes añadir otros campos si vienen en el body
        }, { transaction });

        await transaction.commit();
        return NextResponse.json(nuevoActivo, { status: 201 });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al crear el activo:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
             return NextResponse.json({ message: 'El código de activo ya existe.' }, { status: 409 });
        }

        return NextResponse.json({ message: 'Error al crear el activo', error: error.message }, { status: 500 });
    }
}