// app/api/mantenimientos/[id]/route.js
import { NextResponse } from 'next/server';
import { Mantenimiento, Vehiculo, Empleado } from '../../../../../models'; // Ajusta la ruta

// GET un mantenimiento por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const mantenimiento = await Mantenimiento.findByPk(id, {
      include: [
        { model: Vehiculo, as: 'vehiculo' },
        // { model: Empleado, as: 'responsable' },
      ],
    });
    if (!mantenimiento) {
      return NextResponse.json({ message: 'Mantenimiento no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    return NextResponse.json(mantenimiento, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener mantenimiento con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener mantenimiento.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) un mantenimiento por ID
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const mantenimiento = await Mantenimiento.findByPk(id);
    if (!mantenimiento) {
      return NextResponse.json({ message: 'Mantenimiento no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await mantenimiento.update(body);
    return NextResponse.json({ message: 'Mantenimiento actualizado exitosamente.', mantenimiento }, { status: 200 });
  } catch (error) {
    console.error(`Error al actualizar mantenimiento con ID ${id}:`, error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return NextResponse.json(
        { message: 'ID de vehículo o responsable no válido.', type: 'ForeignKeyConstraintError' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar mantenimiento.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE un mantenimiento por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const mantenimiento = await Mantenimiento.findByPk(id);
    if (!mantenimiento) {
      return NextResponse.json({ message: 'Mantenimiento no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await mantenimiento.destroy();
    return NextResponse.json({ message: 'Mantenimiento eliminado exitosamente.' }, { status: 200 });
  } catch (error) {
    console.error(`Error al eliminar mantenimiento con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar mantenimiento.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}