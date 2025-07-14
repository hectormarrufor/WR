// app/api/tareaMantenimiento/route.js
import { NextResponse } from 'next/server';
import {Mantenimiento, TareaMantenimiento, Vehiculo} from '../../../../models';
// GET todas las tareas de mantenimiento
export async function GET() {
  try {
    const tareasMantenimiento = await TareaMantenimiento.findAll({
      include: [
        { model: Mantenimiento, as: 'mantenimientos' },
        { model: Vehiculo, as: 'vehiculo' },
      ],
    });
    return NextResponse.json(tareasMantenimiento, { status: 200 });
  } catch (error) {
    console.error('Error al obtener tareas de mantenimiento:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener tareas de mantenimiento.', type: 'ServerError' },
      { status: 500 }
    );
  }
}

// POST una nueva tarea de mantenimiento
export async function POST(request) {
  try {
    const body = await request.json();
    const nuevaTareaMantenimiento = await TareaMantenimiento.create(body);
    return NextResponse.json(nuevaTareaMantenimiento, { status: 201 });
  } catch (error) {
    console.error('Error al crear tarea de mantenimiento:', error.message);
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
      { message: 'Error interno del servidor al crear tarea de mantenimiento.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}