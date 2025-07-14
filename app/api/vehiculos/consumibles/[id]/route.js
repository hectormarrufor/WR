// app/api/consumibles/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models';
const {Consumible}=db;
// GET un consumible por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const consumible = await Consumible.findByPk(id);
    if (!consumible) {
      return NextResponse.json({ message: 'Consumible no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    return NextResponse.json(consumible, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener consumible con ID ${id}:`, error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener consumible.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) un consumible por ID
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const consumible = await Consumible.findByPk(id);
    if (!consumible) {
      return NextResponse.json({ message: 'Consumible no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await consumible.update(body);
    return NextResponse.json({ message: 'Consumible actualizado exitosamente.', consumible }, { status: 200 });
  } catch (error) {
    console.error(`Error al actualizar consumible con ID ${id}:`, error);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar consumible.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE un consumible por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const consumible = await Consumible.findByPk(id);
    if (!consumible) {
      return NextResponse.json({ message: 'Consumible no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await consumible.destroy();
    return NextResponse.json({ message: 'Consumible eliminado exitosamente.' }, { status: 200 });
  } catch (error) {
    console.error(`Error al eliminar consumible con ID ${id}:`, error);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar consumible.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}