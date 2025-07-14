// app/api/operaciones/trabajosExtra/route.js
import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const renglonId = searchParams.get('renglonId');

    const whereClause = renglonId ? { renglonId } : {};

    const trabajosExtra = await db.TrabajoExtra.findAll({
      where: whereClause,
      include: [
        { model: db.RenglonContrato, as: 'renglonContrato' },
        // Si hay una asociación a Empleado (quién lo realizó/solicitó) o Vehiculo, incluirla aquí
        // { model: db.Empleado, as: 'solicitadoPor' }
      ],
      order: [['fechaInicio', 'DESC']],
    });
    return NextResponse.json(trabajosExtra);
  } catch (error) {
    console.error('Error fetching trabajos extra:', error);
    return NextResponse.json({ message: 'Error al obtener trabajos extra', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoTrabajo = await db.TrabajoExtra.create(body);
    return NextResponse.json(nuevoTrabajo, { status: 201 });
  } catch (error) {
    console.error('Error creating trabajo extra:', error);
    return NextResponse.json({ message: 'Error al crear trabajo extra', error: error.message }, { status: 400 });
  }
}