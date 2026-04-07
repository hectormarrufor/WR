// app/api/fletes/[id]/route.js
import { Flete, Cliente, Empleado, Activo, TicketPeaje, CargaCombustible, Peaje } from '@/models';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    try {
        const { id } = await params; // Next.js 15: params es una promesa

        const flete = await Flete.findByPk(id, {
            include: [
                { model: Cliente },
                { model: Empleado, as: 'chofer' },
                { model: Activo, as: 'vehiculo' },
                { model: Activo, as: 'remolque' },
                { 
                    model: TicketPeaje, 
                    as: 'peajes',
                    include: [{ model: Peaje, as: 'peaje' }]
                },
                { 
                    model: CargaCombustible, 
                    as: 'cargasCombustible',
                    include: [{ model: Activo, as: 'activo' }]
                }
            ]
        });

        if (!flete) {
            return NextResponse.json({ success: false, error: 'Flete no encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: flete }, { status: 200 });
    } catch (error) {
        console.error("Error GET Flete:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const body = await req.json();

        const flete = await Flete.findByPk(id);
        if (!flete) {
            return NextResponse.json({ success: false, error: 'Flete no encontrado' }, { status: 404 });
        }

        // Se actualizan columnas directas (ej: estado, observaciones, gastos directos)
        await flete.update(body);

        return NextResponse.json({ success: true, data: flete }, { status: 200 });
    } catch (error) {
        console.error("Error PUT Flete:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}