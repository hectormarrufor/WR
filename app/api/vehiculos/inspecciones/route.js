// app/api/inspecciones/route.js
import { NextResponse } from 'next/server';
import {Inspeccion, Vehiculo} from '../../../../models';
// import { Inspeccion, Vehiculo, Usuario } from '../../../models/flota'; // Ajusta la ruta y modelos relacionados

// GET todas las inspecciones
export async function GET() {
  try {
    const inspecciones = await Inspeccion.findAll({
      include: [
        { model: Vehiculo, as: 'vehiculo' },
        // { model: Usuario, as: 'inspector' }, // Si tienes un modelo de Usuario/Inspector
      ],
    });
    return NextResponse.json(inspecciones, { status: 200 });
  } catch (error) {
    console.error('Error al obtener inspecciones:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener inspecciones.', type: 'ServerError' },
      { status: 500 }
    );
  }
}

// POST una nueva inspección
export async function POST(request) {
  try {
    const body = await request.json();
    const nuevaInspeccion = await Inspeccion.create(body);
    return NextResponse.json(nuevaInspeccion, { status: 201 });
  } catch (error) {
    console.error('Error al crear inspección:', error.message);
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
      { message: 'Error interno del servidor al crear inspección.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}