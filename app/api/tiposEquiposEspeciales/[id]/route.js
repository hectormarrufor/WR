// app/api/tiposEquiposEspeciales/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../models'; // Asegúrate que la ruta es correcta

// GET un Tipo de Equipo Especial por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const tipo = await db.TipoEquipoEspecial.findByPk(id);

    if (!tipo) {
      return NextResponse.json(
        { message: 'Tipo de equipo especial no encontrado.', type: 'NotFound' },
        { status: 404 }
      );
    }

    return NextResponse.json(tipo, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener tipo de equipo especial con ID ${id}:`, error.message);
    return NextResponse.json(
      {
        message: 'Error interno del servidor al obtener tipo de equipo especial.',
        type: 'ServerError',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) un Tipo de Equipo Especial por ID
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const { nombre, descripcion } = body;

    const tipo = await db.TipoEquipoEspecial.findByPk(id);

    if (!tipo) {
      return NextResponse.json(
        { message: 'Tipo de equipo especial no encontrado.', type: 'NotFound' },
        { status: 404 }
      );
    }

    await tipo.update({
      nombre,
      descripcion,
    });

    return NextResponse.json(
      { message: 'Tipo de equipo especial actualizado exitosamente.', tipo },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error al actualizar tipo de equipo especial con ID ${id}:`, error.message);
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
      { message: 'Error interno del servidor al actualizar tipo de equipo especial.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE un Tipo de Equipo Especial por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const tipo = await db.TipoEquipoEspecial.findByPk(id);

    if (!tipo) {
      return NextResponse.json(
        { message: 'Tipo de equipo especial no encontrado.', type: 'NotFound' },
        { status: 404 }
      );
    }

    await tipo.destroy();

    return NextResponse.json(
      { message: 'Tipo de equipo especial eliminado exitosamente.' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error al eliminar tipo de equipo especial con ID ${id}:`, error.message);
    return NextResponse.json(
      {
        message: 'Error interno del servidor al eliminar tipo de equipo especial.',
        type: 'ServerError',
        details: error.message,
      },
      { status: 500 }
    );
  }
}