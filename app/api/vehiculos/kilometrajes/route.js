// app/api/kilometrajes/route.js
import { NextResponse } from 'next/server';
import {Kilometraje, Vehiculo} from '../../../../models';
// GET todos los registros de kilometraje
export async function GET() {
  try {
    const kilometrajes = await Kilometraje.findAll({
      include: [{ model: Vehiculo, as: 'vehiculo' }],
    });
    return NextResponse.json(kilometrajes, { status: 200 });
  } catch (error) {
    console.error('Error al obtener kilometrajes:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener kilometrajes.', type: 'ServerError' },
      { status: 500 }
    );
  }
}

// POST un nuevo registro de kilometraje
export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoKilometraje = await Kilometraje.create(body);
    return NextResponse.json(nuevoKilometraje, { status: 201 });
  } catch (error) {
    console.error('Error al crear registro de kilometraje:', error.message);
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
      { message: 'Error interno del servidor al crear registro de kilometraje.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}