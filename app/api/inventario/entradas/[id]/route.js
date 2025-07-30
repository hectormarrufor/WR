import db from '@/models';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const entrada = await db.EntradaInventario.findByPk(params.id);
    return NextResponse.json(entrada);
}

export async function PUT(request, { params }) {
    const transaction = await db.sequelize.transaction();
    try {
        const entrada = await db.EntradaInventario.findByPk(params.id, { transaction });
        const cantidadOriginal = entrada.cantidad;
        
        const body = await request.json();
        const cantidadNueva = body.cantidad;

        const diferencia = cantidadNueva - cantidadOriginal;
        
        await db.Consumible.increment('stock', { by: diferencia, where: { id: entrada.consumibleId }, transaction });
        await entrada.update(body, { transaction });

        await transaction.commit();
        return NextResponse.json(entrada);
    } catch (error) {
        await transaction.rollback();
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}