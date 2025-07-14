// app/api/consumibleUsado/[id]/route.js
import { NextResponse } from 'next/server';
import Consumible from '../../../../../models';
import ConsumibleUsado from '../../../../../models';
import Vehiculo from '../../../../../models';
// GET un registro de consumible usado por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const consumibleUsado = await ConsumibleUsado.findByPk(id, {
      include: [
        { model: Consumible, as: 'consumible' },
        { model: Vehiculo, as: 'vehiculo' },
      ],
    });
    if (!consumibleUsado) {
      return NextResponse.json({ message: 'Registro de consumible usado no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    return NextResponse.json(consumibleUsado, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener registro de consumible usado con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener registro de consumible usado.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) un registro de consumible usado por ID
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const consumibleUsado = await ConsumibleUsado.findByPk(id);
    if (!consumibleUsado) {
      return NextResponse.json({ message: 'Registro de consumible usado no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await consumibleUsado.update(body);
    return NextResponse.json({ message: 'Registro de consumible usado actualizado exitosamente.', consumibleUsado }, { status: 200 });
  } catch (error) {
    console.error(`Error al actualizar registro de consumible usado con ID ${id}:`, error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return NextResponse.json(
        { message: 'ID de consumible o vehículo no válido.', type: 'ForeignKeyConstraintError' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar registro de consumible usado.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE un registro de consumible usado por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const consumibleUsado = await ConsumibleUsado.findByPk(id);
    if (!consumibleUsado) {
      return NextResponse.json({ message: 'Registro de consumible usado no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await consumibleUsado.destroy();
    return NextResponse.json({ message: 'Registro de consumible usado eliminado exitosamente.' }, { status: 200 });
  } catch (error) {
    console.error(`Error al eliminar registro de consumible usado con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar registro de consumible usado.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}