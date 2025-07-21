// app/api/hallazgoInspeccion/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models';

// GET un hallazgo de inspección por ID
export async function GET(request, { params }) {
 const { id } = await params;
  try {
    const hallazgo = await db.HallazgoInspeccion.findByPk(id, {
      include: [
        { model: db.Vehiculo, as: 'vehiculo' }, // Puedes incluir el vehículo si lo necesitas
        { model: db.Inspeccion, as: 'inspeccion' }, // <-- Asegúrate de incluir la Inspeccion si la necesitas
      ],
    });

    if (!hallazgo) {
      return NextResponse.json({ message: 'Hallazgo de inspección no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    return NextResponse.json(hallazgo, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener hallazgo de inspección con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener hallazgo de inspección.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) un hallazgo de inspección por ID
export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const hallazgoInspeccion = await db.HallazgoInspeccion.findByPk(id);
    if (!hallazgoInspeccion) {
      return NextResponse.json({ message: 'Hallazgo de inspección no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await hallazgoInspeccion.update(body);
    return NextResponse.json({ message: 'Hallazgo de inspección actualizado exitosamente.', hallazgoInspeccion }, { status: 200 });
  } catch (error) {
    console.error(`Error al actualizar hallazgo de inspección con ID ${id}:`, error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return NextResponse.json(
        { message: 'ID de inspección no válido.', type: 'ForeignKeyConstraintError' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar hallazgo de inspección.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE un hallazgo de inspección por ID
export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const hallazgoInspeccion = await db.HallazgoInspeccion.findByPk(id);
    if (!hallazgoInspeccion) {
      return NextResponse.json({ message: 'Hallazgo de inspección no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    await hallazgoInspeccion.destroy();
    return NextResponse.json({ message: 'Hallazgo de inspección eliminado exitosamente.' }, { status: 200 });
  } catch (error) {
    console.error(`Error al eliminar hallazgo de inspección con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar hallazgo de inspección.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}