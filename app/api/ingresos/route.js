import { Ingreso, Flete, ODT, MovimientoTesoreria } from '@/models';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();

    // Validar que si es tipo Flete, traiga el fleteId
    if (body.tipoOrigen === 'Flete' && !body.fleteId) {
        return NextResponse.json({ error: "Debe vincular un Flete para este tipo de ingreso" }, { status: 400 });
    }

    const nuevoIngreso = await Ingreso.create({
        ...body,
        montoUsd: parseFloat(body.montoUsd),
        tasaBcv: parseFloat(body.tasaBcv || 0)
    });

    return NextResponse.json({ success: true, data: nuevoIngreso }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
    try {
        const ingresos = await Ingreso.findAll({
            include: ['cliente', 'flete'],
            order: [['fechaIngreso', 'DESC']]
        });
        return NextResponse.json(ingresos);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}