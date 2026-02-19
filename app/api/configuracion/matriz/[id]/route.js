import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(req, { params }) {
    const { id } = await params; // ID de la matriz a obtener
    const matriz = await db.MatrizCosto.findByPk(id, {
        include: [{ model: db.DetalleMatrizCosto, as: 'detalles' }]
    });
    return NextResponse.json({ header: matriz, detalles: matriz.detalles });
}

export async function PUT(req, { params }) {
    const body = await req.json(); // { detalles: [], totalCalculado: 0.45 }
    const t = await db.sequelize.transaction();

    try {
        // 1. Actualizar Header con el nuevo total
        await db.MatrizCosto.update(
            {
                totalCostoKm: body.totalCostoKm,
                totalCostoHora: body.totalCostoHora,
                costoPosesionHora: body.costoPosesionHora
            },
            { where: { id: id }, transaction: t }
        );

        // 2. Reemplazar detalles (Estrategia simple: Borrar y Crear)
        await db.DetalleMatrizCosto.destroy({ where: { matrizId: id }, transaction: t });

        const nuevosDetalles = body.detalles.map(d => ({
            ...d,
            matrizId: params.id
        }));

        await db.DetalleMatrizCosto.bulkCreate(nuevosDetalles, { transaction: t });

        await t.commit();
        return NextResponse.json({ success: true });
    } catch (e) {
        await t.rollback();
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}