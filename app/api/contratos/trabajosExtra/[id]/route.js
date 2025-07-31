// app/api/operaciones/trabajosExtra/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const trabajo = await db.TrabajoExtra.findByPk(id, {
      include: [
        { model: db.RenglonContrato, as: 'renglonContrato' },
        // Incluir asociaciones adicionales si las hay
      ],
    });

    if (!trabajo) {
      return NextResponse.json({ message: 'Trabajo extra no encontrado' }, { status: 404 });
    }
    return NextResponse.json(trabajo);
  } catch (error) {
    console.error('Error fetching trabajo extra:', error);
    return NextResponse.json({ message: 'Error al obtener trabajo extra', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const trabajo = await db.TrabajoExtra.findByPk(id);
    if (!trabajo) {
      return NextResponse.json({ message: 'Trabajo extra no encontrado' }, { status: 404 });
    }
    await trabajo.update(body);
    return NextResponse.json(trabajo);
  } catch (error) {
    console.error('Error updating trabajo extra:', error);
    return NextResponse.json({ message: 'Error al actualizar trabajo extra', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const trabajo = await db.TrabajoExtra.findByPk(id);
    if (!trabajo) {
      return NextResponse.json({ message: 'Trabajo extra no encontrado' }, { status: 404 });
    }
    await trabajo.destroy();
    return NextResponse.json({ message: 'Trabajo extra eliminado exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting trabajo extra:', error);
    return NextResponse.json({ message: 'Error al eliminar trabajo extra', error: error.message }, { status: 500 });
  }
}