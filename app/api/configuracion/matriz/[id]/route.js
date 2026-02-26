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
    const body = await req.json(); 
    const t = await db.sequelize.transaction();
    
    // 👇 ¡ESTA LÍNEA ES LA QUE FALTABA! 👇
    const { id } = await params; 

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

        // Limpiamos los IDs viejos para que Sequelize no se confunda al recrear
        const nuevosDetalles = body.detalles.map(d => {
            const { id: oldId, createdAt, updatedAt, ...rest } = d; 
            return {
                ...rest,
                matrizId: id
            };
        });

        await db.DetalleMatrizCosto.bulkCreate(nuevosDetalles, { transaction: t });

        await t.commit();
        return NextResponse.json({ success: true });
    } catch (e) {
        await t.rollback();
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        
        // Destruye la matriz (y el CASCADE destruirá sus detalles automáticamente)
        await db.MatrizCosto.destroy({ where: { id: id } });
        
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}