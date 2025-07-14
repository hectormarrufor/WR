// app/api/parte/[id]/route.js
import { NextResponse } from 'next/server';
import {Parte} from '../../../../../models/flota';
// GET una parte por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const parte = await Parte.findByPk(id);
    if (!parte) {
      return NextResponse.json({ message: 'Parte no encontrada.', type: 'NotFound' }, { status: 404 });
    }
    return NextResponse.json(parte, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener parte con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener parte.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) una parte por ID
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const parte = await Parte.findByPk(id);
    if (!parte) {
      return NextResponse.json({ message: 'Parte no encontrada.', type: 'NotFound' }, { status: 404 });
    }
    await parte.update(body);
    return NextResponse.json({ message: 'Parte actualizada exitosamente.', parte }, { status: 200 });
  } catch (error) {
    console.error(`Error al actualizar parte con ID ${id}:`, error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar parte.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE una parte por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const parte = await Parte.findByPk(id);
    if (!parte) {
      return NextResponse.json({ message: 'Parte no encontrada.', type: 'NotFound' }, { status: 404 });
    }
    await parte.destroy();
    return NextResponse.json({ message: 'Parte eliminada exitosamente.' }, { status: 200 });
  } catch (error) {
    console.error(`Error al eliminar parte con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar parte.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}