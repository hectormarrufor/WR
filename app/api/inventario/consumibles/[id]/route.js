import db from '@/models';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const consumible = await db.Consumible.findByPk(params.id);
    if (!consumible) return NextResponse.json({ message: 'Consumible no encontrado' }, { status: 404 });
    return NextResponse.json(consumible);
}

export async function PUT(request, { params }) {
   const transaction = await db.sequelize.transaction();
    try {
        const consumible = await db.Consumible.findByPk(params.id, { transaction });
        if (!consumible) {
            await transaction.rollback();
            return NextResponse.json({ message: 'Consumible no encontrado' }, { status: 404 });
        }

        const body = await request.json();
        const { compatibilidades, ...consumibleData } = body;

        // 1. Actualizamos los datos principales del consumible.
        await consumible.update(consumibleData, { transaction });

        // 2. ✨ LÓGICA CLAVE: Actualizamos las asociaciones de compatibilidad.
        if (compatibilidades && Array.isArray(compatibilidades)) {
            // Extraemos solo los IDs de los modelos de los objetos de compatibilidad.
            const modelosIds = compatibilidades.map(comp => comp.modeloId);
            
            // 'setModelosCompatibles' es un mixin de Sequelize.
            // Borra todas las asociaciones viejas y las reemplaza con las nuevas.
            // ¡Es la forma más fácil y segura de sincronizar una relación de muchos a muchos!
            await consumible.setModelosCompatibles(modelosIds, { transaction });
        }

        await transaction.commit();
        return NextResponse.json(consumible);

    } catch (error) {
        await transaction.rollback();
        console.error('Error al actualizar consumible:', error);
        return NextResponse.json({ message: 'Error al actualizar el consumible' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const consumible = await db.Consumible.findByPk(params.id);
    if (!consumible) return NextResponse.json({ message: 'Consumible no encontrado' }, { status: 404 });

    // Lógica para verificar si está en uso antes de borrar
    await consumible.destroy();
    return new Response(null, { status: 204 });
}