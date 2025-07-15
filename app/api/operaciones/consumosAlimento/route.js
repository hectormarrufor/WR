// app/api/operaciones/consumosAlimento/route.js
import { NextResponse } from 'next/server';
import db from '../../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const renglonId = searchParams.get('renglonId');

    const whereClause = renglonId ? { renglonId } : {};

    const consumos = await db.ConsumoAlimento.findAll({
      where: whereClause,
      include: [
        { model: db.RenglonContrato, as: 'renglonContrato' },
        { model: db.Empleado, as: 'empleadoQueRecibio' }, // Si tienes esta asociación
        { model: db.Empleado, as: 'registradoPor' } // Si tienes esta asociación
      ],
      order: [['fechaConsumo', 'DESC']],
    });
    return NextResponse.json(consumos);
  } catch (error) {
    console.error('Error fetching consumos de alimento:', error);
    return NextResponse.json({ message: 'Error al obtener consumos de alimento', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoConsumo = await db.ConsumoAlimento.create(body);
    return NextResponse.json(nuevoConsumo, { status: 201 });
  } catch (error) {
    console.error('Error creating consumo de alimento:', error);
    return NextResponse.json({ message: 'Error al crear consumo de alimento', error: error.message }, { status: 400 });
  }
}