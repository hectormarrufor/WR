// app/api/mantenimientos/route.js
import { NextResponse } from 'next/server';
import {Mantenimiento, Vehiculo} from '../../../../models';
// import { Mantenimiento, Vehiculo, Usuario } from '../../../models/flota'; // Ajusta la ruta

// GET todos los mantenimientos
export async function GET() {
  try {
    const mantenimientos = await Mantenimiento.findAll({
      include: [
        { model: Vehiculo, as: 'vehiculo' },
        // { model: Usuario, as: 'responsable' }, // Si tienes un modelo de Usuario
      ],
    });
    return NextResponse.json(mantenimientos, { status: 200 });
  } catch (error) {
    console.error('Error al obtener mantenimientos:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener mantenimientos.', type: 'ServerError' },
      { status: 500 }
    );
  }
}

// POST un nuevo mantenimiento
export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoMantenimiento = await Mantenimiento.create(body);
    return NextResponse.json(nuevoMantenimiento, { status: 201 });
  } catch (error) {
    console.error('Error al crear mantenimiento:', error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return NextResponse.json(
        { message: 'ID de vehículo o responsable no válido.', type: 'ForeignKeyConstraintError' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al crear mantenimiento.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}