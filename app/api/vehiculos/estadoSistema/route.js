// app/api/estadoSistema/route.js
import { NextResponse } from 'next/server';
import EstadoSistemaVehiculo from '../../../../models';
import Vehiculo from '../../../../models';
// GET todos los estados de sistema
export async function GET() {
  try {
    const estadosSistema = await EstadoSistemaVehiculo.findAll({
      include: [{ model: Vehiculo, as: 'vehiculo' }],
    });
    return NextResponse.json(estadosSistema, { status: 200 });
  } catch (error) {
    console.error('Error al obtener estados de sistema:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener estados de sistema.', type: 'ServerError' },
      { status: 500 }
    );
  }
}

// POST un nuevo estado de sistema
export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoEstadoSistema = await EstadoSistemaVehiculo.create(body);
    return NextResponse.json(nuevoEstadoSistema, { status: 201 });
  } catch (error) {
    console.error('Error al crear estado de sistema:', error.message);
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
      { message: 'Error interno del servidor al crear estado de sistema.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}