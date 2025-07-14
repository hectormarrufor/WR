// app/api/parte/route.js
import { NextResponse } from 'next/server';
import {Parte} from '../../../../models/flota';
// GET todas las partes
export async function GET() {
  try {
    const partes = await Parte.findAll();
    return NextResponse.json(partes, { status: 200 });
  } catch (error) {
    console.error('Error al obtener partes:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener partes.', type: 'ServerError' },
      { status: 500 }
    );
  }
}

// POST una nueva parte
export async function POST(request) {
  try {
    const body = await request.json();
    const nuevaParte = await Parte.create(body);
    return NextResponse.json(nuevaParte, { status: 201 });
  } catch (error) {
    console.error('Error al crear parte:', error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al crear parte.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}