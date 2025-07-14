// app/api/consumibles/route.js
import { NextResponse } from 'next/server';
import db from '../../../../models';
const {Consumible} = db;
// GET todos los consumibles
export async function GET() {
  try {
    const consumibles = await Consumible.findAll();
    return NextResponse.json(consumibles, { status: 200 });
  } catch (error) {
    console.error('Error al obtener consumibles:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener consumibles.', type: 'ServerError' },
      { status: 500 }
    );
  }
}

// POST un nuevo consumible
export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoConsumible = await Consumible.create(body);
    return NextResponse.json(nuevoConsumible, { status: 201 });
  } catch (error) {
    console.error('Error al crear consumible:', error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al crear consumible.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}