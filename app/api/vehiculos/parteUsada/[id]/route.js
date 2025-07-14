// app/api/parteUsada/[id]/route.js
import { NextResponse } from 'next/server';
import {Parte, ParteUsada, Vehiculo} from '../../../../../models';
// GET un registro de parte usada por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const parteUsada = await ParteUsada.findByPk(id, {
      include: [
        { model: Parte, as: 'parte' },
        { model: Vehiculo, as: 'vehiculo' },
      ],
    });
    if (!parteUsada) {
      return NextResponse.json({ message: 'Registro de parte usada no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    return NextResponse.json(parteUsada, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener registro de parte usada con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener registro de parte usada.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) un registro de parte usada por ID
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const parteUsada = await ParteUsada.findByPk(id);
    if (!parteUsada) {
      return NextResponse.json({ message: 'Registro de parte usada no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await parteUsada.update(body);
    return NextResponse.json({ message: 'Registro de parte usada actualizado exitosamente.', parteUsada }, { status: 200 });
  } catch (error) {
    console.error(`Error al actualizar registro de parte usada con ID ${id}:`, error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return NextResponse.json(
        { message: 'ID de parte o vehículo no válido.', type: 'ForeignKeyConstraintError' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar registro de parte usada.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE un registro de parte usada por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const parteUsada = await ParteUsada.findByPk(id);
    if (!parteUsada) {
      return NextResponse.json({ message: 'Registro de parte usada no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await parteUsada.destroy();
    return NextResponse.json({ message: 'Registro de parte usada eliminado exitosamente.' }, { status: 200 });
  } catch (error) {
    console.error(`Error al eliminar registro de parte usada con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar registro de parte usada.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}