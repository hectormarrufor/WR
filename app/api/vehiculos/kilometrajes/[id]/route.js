// app/api/kilometrajes/[id]/route.js
import { NextResponse } from 'next/server';
import {Kilometraje, Vehiculo} from '../../../../../models';
// GET un registro de kilometraje por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const kilometraje = await Kilometraje.findByPk(id, {
      include: [{ model: Vehiculo, as: 'vehiculo' }],
    });
    if (!kilometraje) {
      return NextResponse.json({ message: 'Registro de kilometraje no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    return NextResponse.json(kilometraje, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener kilometraje con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener kilometraje.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) un registro de kilometraje por ID
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const kilometraje = await Kilometraje.findByPk(id);
    if (!kilometraje) {
      return NextResponse.json({ message: 'Registro de kilometraje no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await kilometraje.update(body);
    return NextResponse.json({ message: 'Registro de kilometraje actualizado exitosamente.', kilometraje }, { status: 200 });
  } catch (error) {
    console.error(`Error al actualizar kilometraje con ID ${id}:`, error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return NextResponse.json(
        { message: 'ID de vehículo no válido.', type: 'ForeignKeyConstraintError' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar kilometraje.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE un registro de kilometraje por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const kilometraje = await Kilometraje.findByPk(id);
    if (!kilometraje) {
      return NextResponse.json({ message: 'Registro de kilometraje no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await kilometraje.destroy();
    return NextResponse.json({ message: 'Registro de kilometraje eliminado exitosamente.' }, { status: 200 });
  } catch (error) {
    console.error(`Error al eliminar kilometraje con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar kilometraje.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}