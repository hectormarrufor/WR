import db from '@/models';
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const activoId = searchParams.get('activoId');
    const estado = searchParams.get('estado');
    const ids = searchParams.get('ids')?.split(','); // ✨ NUEVA LÓGICA: Acepta un array de IDs

    try {
        const whereClause = {};

        if (activoId) whereClause.activoId = activoId;
        if (estado) whereClause.estado = estado;
        if (ids) whereClause.id = { [Op.in]: ids }; // Filtra por el array de IDs

        const hallazgos = await db.Hallazgo.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            include: [{ model: db.Inspeccion, as: 'inspeccion' }]
        });

        return NextResponse.json(hallazgos);
    } catch (error) {
        console.error("Error al obtener hallazgos:", error);
        return NextResponse.json({ message: 'Error al obtener los hallazgos' }, { status: 500 });
    }
}