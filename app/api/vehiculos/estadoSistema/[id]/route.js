// app/api/estadoSistema/[id]/route.js
import { NextResponse } from 'next/server';
import EstadoSistemaVehiculo from '../../../../../models';
import Vehiculo from '../../../../../models';
// GET un estado de sistema por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const estadoSistema = await EstadoSistemaVehiculo.findByPk(id, {
      include: [{ model: Vehiculo, as: 'vehiculo' }],
    });
    if (!estadoSistema) {
      return NextResponse.json({ message: 'Estado de sistema no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    return NextResponse.json(estadoSistema, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener estado de sistema con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener estado de sistema.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) un estado de sistema por ID
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const estadoSistema = await EstadoSistemaVehiculo.findByPk(id);
    if (!estadoSistema) {
      return NextResponse.json({ message: 'Estado de sistema no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await estadoSistema.update(body);
    return NextResponse.json({ message: 'Estado de sistema actualizado exitosamente.', estadoSistema }, { status: 200 });
  } catch (error) {
    console.error(`Error al actualizar estado de sistema con ID ${id}:`, error.message);
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
      { message: 'Error interno del servidor al actualizar estado de sistema.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE un estado de sistema por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const estadoSistema = await EstadoSistemaVehiculo.findByPk(id);
    if (!estadoSistema) {
      return NextResponse.json({ message: 'Estado de sistema no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await estadoSistema.destroy();
    return NextResponse.json({ message: 'Estado de sistema eliminado exitosamente.' }, { status: 200 });
  } catch (error) {
    console.error(`Error al eliminar estado de sistema con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar estado de sistema.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}