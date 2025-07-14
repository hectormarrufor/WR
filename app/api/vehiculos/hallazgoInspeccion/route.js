// app/api/hallazgoInspeccion/route.js
import { NextResponse } from 'next/server';
import {HallazgoInspeccion, Inspeccion} from '../../../../models';
// GET todos los hallazgos de inspección
export async function GET() {
  try {
    const hallazgosInspeccion = await HallazgoInspeccion.findAll({
      include: [{ model: Inspeccion, as: 'inspeccion' }],
    });
    return NextResponse.json(hallazgosInspeccion, { status: 200 });
  } catch (error) {
    console.error('Error al obtener hallazgos de inspección:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener hallazgos de inspección.', type: 'ServerError' },
      { status: 500 }
    );
  }
}

// POST un nuevo hallazgo de inspección
export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoHallazgoInspeccion = await HallazgoInspeccion.create(body);
    return NextResponse.json(nuevoHallazgoInspeccion, { status: 201 });
  } catch (error) {
    console.error('Error al crear hallazgo de inspección:', error.message);
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
      { message: 'Error interno del servidor al crear hallazgo de inspección.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}