// app/api/parteUsada/route.js
import { NextResponse } from 'next/server';
import {ParteUsada, Parte, Vehiculo} from '../../../../models';
// GET todos los registros de partes usadas
export async function GET() {
  try {
    const partesUsadas = await ParteUsada.findAll({
      include: [
        { model: Parte, as: 'parte' },
        { model: Vehiculo, as: 'vehiculo' },
      ],
    });
    return NextResponse.json(partesUsadas, { status: 200 });
  } catch (error) {
    console.error('Error al obtener partes usadas:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener partes usadas.', type: 'ServerError' },
      { status: 500 }
    );
  }
}

// POST un nuevo registro de parte usada
export async function POST(request) {
  try {
    const body = await request.json();
    const nuevaParteUsada = await ParteUsada.create(body);
    return NextResponse.json(nuevaParteUsada, { status: 201 });
  } catch (error) {
    console.error('Error al crear registro de parte usada:', error.message);
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
      { message: 'Error interno del servidor al crear registro de parte usada.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}