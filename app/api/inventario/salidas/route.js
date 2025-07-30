import db from '@/models';
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';

// GET para obtener todas las salidas
export async function GET() {
    try {
        const salidas = await db.SalidaInventario.findAll({
            include: [
                { model: db.Consumible, as: 'consumible', attributes: ['nombre', 'unidadMedida'] },
                { model: db.Activo, as: 'activo', attributes: ['codigoActivo'] }
            ],
            order: [['fecha', 'DESC']]
        });
        return NextResponse.json(salidas);
    } catch (error) {
        return NextResponse.json({ message: 'Error al obtener las salidas' }, { status: 500 });
    }
}

// POST para registrar una nueva salida (con justificación)
export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { consumibleId, cantidad } = body;

        const consumible = await db.Consumible.findByPk(consumibleId, { transaction });
        if (!consumible || consumible.stock < cantidad) {
            throw new Error('Stock insuficiente o el consumible no existe.');
        }

        await consumible.decrement('stock', { by: cantidad, transaction });
        const nuevaSalida = await db.SalidaInventario.create(body, { transaction });

        await transaction.commit();
        return NextResponse.json(nuevaSalida, { status: 201 });
    } catch (error) {
        await transaction.rollback();
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}