// app/api/tareaMantenimiento/[id]/route.js
import { NextResponse } from 'next/server';
import { TareaMantenimiento, Mantenimiento, Vehiculo } from '../../../../../models'; // Ajusta la ruta y modelos relacionados


// GET una tarea de mantenimiento por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const tareaMantenimiento = await TareaMantenimiento.findByPk(id, {
      include: [
        { model: Mantenimiento, as: 'mantenimientos' },
        { model: Vehiculo, as: 'vehiculo' },
      ],
    });
    if (!tareaMantenimiento) {
      return NextResponse.json({ message: 'Tarea de mantenimiento no encontrada.', type: 'NotFound' }, { status: 404 });
    }
    return NextResponse.json(tareaMantenimiento, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener tarea de mantenimiento con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener tarea de mantenimiento.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) una tarea de mantenimiento por ID
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const tareaMantenimiento = await TareaMantenimiento.findByPk(id);
    if (!tareaMantenimiento) {
      return NextResponse.json({ message: 'Tarea de mantenimiento no encontrada.', type: 'NotFound' }, { status: 404 });
    }
    await tareaMantenimiento.update(body);
    return NextResponse.json({ message: 'Tarea de mantenimiento actualizada exitosamente.', tareaMantenimiento }, { status: 200 });
  } catch (error) {
    console.error(`Error al actualizar tarea de mantenimiento con ID ${id}:`, error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return NextResponse.json(
        { message: 'ID de mantenimiento o vehículo no válido.', type: 'ForeignKeyConstraintError' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar tarea de mantenimiento.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE una tarea de mantenimiento por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const tareaMantenimiento = await TareaMantenimiento.findByPk(id);
    if (!tareaMantenimiento) {
      return NextResponse.json({ message: 'Tarea de mantenimiento no encontrada.', type: 'NotFound' }, { status: 404 });
    }
    await tareaMantenimiento.destroy();
    return NextResponse.json({ message: 'Tarea de mantenimiento eliminada exitosamente.' }, { status: 200 });
  } catch (error) {
    console.error(`Error al eliminar tarea de mantenimiento con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar tarea de mantenimiento.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}