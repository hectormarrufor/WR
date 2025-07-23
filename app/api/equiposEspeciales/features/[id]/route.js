// app/api/equiposEspeciales/features/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models';

// GET una Feature de Equipo Especial por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const feature = await db.FeatureEquipoEspecial.findByPk(id, {
      include: [ // Incluir subFeatures si esta feature puede tener hijos
        {
          model: db.FeatureEquipoEspecial,
          as: 'subFeatures',
          required: false,
        },
        {
          model: db.FeatureEquipoEspecial,
          as: 'parentFeature', // Incluir el padre si lo necesitas
          required: false,
        }
      ],
    });

    if (!feature) {
      return NextResponse.json(
        { message: 'Feature no encontrada.', type: 'NotFound' },
        { status: 404 }
      );
    }

    return NextResponse.json(feature, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener feature con ID ${id}:`, error.message);
    return NextResponse.json(
      {
        message: 'Error interno del servidor al obtener feature.',
        type: 'ServerError',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) una Feature de Equipo Especial por ID
export async function PUT(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction(); // Iniciar una transacción
  try {
    const body = await request.json();
    const { nombre, descripcion, tipoValorEsperado, esRequerido, orden, parentFeatureId } = body;

    const feature = await db.FeatureEquipoEspecial.findByPk(id, { transaction });

    if (!feature) {
      await transaction.rollback();
      return NextResponse.json(
        { message: 'Feature no encontrada.', type: 'NotFound' },
        { status: 404 }
      );
    }

    await feature.update({
      nombre,
      descripcion,
      tipoValorEsperado,
      esRequerido,
      orden,
      parentFeatureId: parentFeatureId || null,
    }, { transaction });

    await transaction.commit(); // Confirmar la operación

    return NextResponse.json(
      { message: 'Feature actualizada exitosamente.', feature },
      { status: 200 }
    );
  } catch (error) {
    await transaction.rollback(); // Revertir la transacción si falla
    console.error(`Error al actualizar feature con ID ${id}:`, error.message);
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
          message: `Ya existe una feature con el mismo '${field}': ${value}.`,
          type: 'UniqueConstraintError',
          field: field,
          value: value,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al actualizar feature.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE una Feature de Equipo Especial por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction(); // Iniciar una transacción
  try {
    const feature = await db.FeatureEquipoEspecial.findByPk(id, { transaction });

    if (!feature) {
      await transaction.rollback();
      return NextResponse.json(
        { message: 'Feature no encontrada.', type: 'NotFound' },
        { status: 404 }
      );
    }

    await feature.destroy({ transaction }); // Esto eliminará subFeatures si parentFeatureId está configurado con onDelete: CASCADE

    await transaction.commit(); // Confirmar la operación

    return NextResponse.json(
      { message: 'Feature eliminada exitosamente.' },
      { status: 200 }
    );
  } catch (error) {
    await transaction.rollback(); // Revertir la transacción si falla
    console.error(`Error al eliminar feature con ID ${id}:`, error.message);
    return NextResponse.json(
      {
        message: 'Error interno del servidor al eliminar feature.',
        type: 'ServerError',
        details: error.message,
      },
      { status: 500 }
    );
  }
}