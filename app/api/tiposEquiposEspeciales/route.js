// app/api/tiposEquiposEspeciales/route.js
import { NextResponse } from 'next/server';
import db from '../../../models';

// GET todos los Tipos de Equipos Especiales
export async function GET() {
  try {
    const tipos = await db.TipoEquipoEspecial.findAll({
      order: [['nombre', 'ASC']],
    });
    return NextResponse.json(tipos, { status: 200 });
  } catch (error) {
    console.error('Error al obtener tipos de equipos especiales:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener tipos de equipos especiales.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// POST un nuevo Tipo de Equipo Especial
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, descripcion } = body;

    const nuevoTipo = await db.TipoEquipoEspecial.create({
      nombre,
      descripcion,
    });

    return NextResponse.json(nuevoTipo, { status: 201 });
  } catch (error) {
    console.error('Error al crear tipo de equipo especial:', error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path || 'campo desconocido';
      const value = error.errors[0]?.value || 'valor desconocido';
      return NextResponse.json(
        {
          message: `Ya existe un tipo de equipo especial con el mismo '${field}': ${value}.`,
          type: 'UniqueConstraintError',
          field: field,
          value: value,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al crear tipo de equipo especial.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}