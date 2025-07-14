// app/api/inspecciones/[id]/route.js
import { NextResponse } from 'next/server';
import {Inspeccion, Vehiculo} from '../../../../../models';
// import { Inspeccion, Vehiculo, Usuario } from '../../../../models/flota'; // Ajusta la ruta y modelos relacionados
// GET una inspección por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const inspeccion = await Inspeccion.findByPk(id, {
      include: [
        { model: Vehiculo, as: 'vehiculo' },
        // { model: Usuario, as: 'inspector' },
      ],
    });
    if (!inspeccion) {
      return NextResponse.json({ message: 'Inspección no encontrada.', type: 'NotFound' }, { status: 404 });
    }
    return NextResponse.json(inspeccion, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener inspección con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener inspección.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) una inspección por ID
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const inspeccion = await Inspeccion.findByPk(id);
    if (!inspeccion) {
      return NextResponse.json({ message: 'Inspección no encontrada.', type: 'NotFound' }, { status: 404 });
    }
    await inspeccion.update(body);
    return NextResponse.json({ message: 'Inspección actualizada exitosamente.', inspeccion }, { status: 200 });
  } catch (error) {
    console.error(`Error al actualizar inspección con ID ${id}:`, error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return NextResponse.json(
        { message: 'ID de vehículo o usuario no válido.', type: 'ForeignKeyConstraintError' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar inspección.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE una inspección por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const inspeccion = await Inspeccion.findByPk(id);
    if (!inspeccion) {
      return NextResponse.json({ message: 'Inspección no encontrada.', type: 'NotFound' }, { status: 404 });
    }
    await inspeccion.destroy();
    return NextResponse.json({ message: 'Inspección eliminada exitosamente.' }, { status: 200 });
  } catch (error) {
    console.error(`Error al eliminar inspección con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar inspección.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}