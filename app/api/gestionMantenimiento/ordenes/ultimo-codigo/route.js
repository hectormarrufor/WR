import db from '@/models';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
  

        // Encontrar el último código de orden de mantenimiento para todos los activos
        const ultimaOrden = await db.Mantenimiento.findOne({
            order: [['createdAt', 'DESC']],
            attributes: ['codigoOM'],
        });
        const ultimoCodigo = ultimaOrden ? ultimaOrden.codigoOM : null;
        return NextResponse.json( ultimoCodigo );
    } catch (error) {
        console.error("Error al obtener el último código de orden de mantenimiento:", error);
        return NextResponse.json({ message: 'Error al obtener el último código de orden de mantenimiento', error: error.message }, { status: 500 });

    }
}