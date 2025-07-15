// app/api/consumibleUsado/route.js
import { NextResponse } from 'next/server';
import { Consumible, ConsumibleUsado, Vehiculo } from '../../../../models';


// GET todos los registros de consumibles usados
export async function GET() {
  try {
    const consumiblesUsados = await ConsumibleUsado.findAll({
      include: [
        { model: Consumible, as: 'consumible' },
        { model: Vehiculo, as: 'vehiculo' },
      ],
    });
    return NextResponse.json(consumiblesUsados, { status: 200 });
  } catch (error) {
    console.error('Error al obtener consumibles usados:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener consumibles usados.', type: 'ServerError' },
      { status: 500 }
    );
  }
}

// POST un nuevo registro de consumible usado
export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoConsumibleUsado = await ConsumibleUsado.create(body);
    return NextResponse.json(nuevoConsumibleUsado, { status: 201 });
  } catch (error) {
    console.error('Error al crear registro de consumible usado:', error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return NextResponse.json(
        { message: 'ID de consumible o vehículo no válido.', type: 'ForeignKeyConstraintError' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al crear registro de consumible usado.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}