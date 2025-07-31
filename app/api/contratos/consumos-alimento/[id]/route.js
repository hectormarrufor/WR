// app/api/operaciones/consumosAlimento/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const consumo = await db.ConsumoAlimento.findByPk(id, {
      include: [
        { model: db.RenglonContrato, as: 'renglonContrato' },
        { model: db.Empleado, as: 'empleadoQueRecibio' },
        { model: db.Empleado, as: 'registradoPor' }
      ],
    });

    if (!consumo) {
      return NextResponse.json({ message: 'Consumo de alimento no encontrado' }, { status: 404 });
    }
    return NextResponse.json(consumo);
  } catch (error) {
    console.error('Error fetching consumo de alimento:', error);
    return NextResponse.json({ message: 'Error al obtener consumo de alimento', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const consumo = await db.ConsumoAlimento.findByPk(id);
    if (!consumo) {
      return NextResponse.json({ message: 'Consumo de alimento no encontrado' }, { status: 404 });
    }
    await consumo.update(body);
    return NextResponse.json(consumo);
  } catch (error) {
    console.error('Error updating consumo de alimento:', error);
    return NextResponse.json({ message: 'Error al actualizar consumo de alimento', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const consumo = await db.ConsumoAlimento.findByPk(id);
    if (!consumo) {
      return NextResponse.json({ message: 'Consumo de alimento no encontrado' }, { status: 404 });
    }
    await consumo.destroy();
    return NextResponse.json({ message: 'Consumo de alimento eliminado exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting consumo de alimento:', error);
    return NextResponse.json({ message: 'Error al eliminar consumo de alimento', error: error.message }, { status: 500 });
  }
}