// app/api/equiposEspeciales/features/route.js
import { NextResponse } from 'next/server';
import db from '../../../../models';

// GET todas las Features de Equipos Especiales
export async function GET() {
  try {
    const features = await db.FeatureEquipoEspecial.findAll({
      order: [['orden', 'ASC'], ['nombre', 'ASC']], // Ordenar por orden y luego por nombre
      include: [ // Si quieres incluir subFeatures anidadas para la estructura de árbol
        {
          model: db.FeatureEquipoEspecial,
          as: 'subFeatures',
          required: false,
          // Puedes incluir recursivamente más niveles si lo necesitas,
          // pero ten cuidado con la profundidad para evitar bucles infinitos o sobrecarga.
          // include: [{ model: db.FeatureEquipoEspecial, as: 'subFeatures' }]
        }
      ],
      where: {
        parentFeatureId: null, // Solo traer las features de nivel superior por defecto
      },
    });
    return NextResponse.json(features, { status: 200 });
  } catch (error) {
    console.error('Error al obtener features de equipos especiales:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener features.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// POST una nueva Feature de Equipo Especial
export async function POST(request) {
  const transaction = await db.sequelize.transaction(); // Iniciar una transacción
  try {
    const body = await request.json();
    const { nombre, descripcion, tipoValorEsperado, esRequerido, orden, parentFeatureId } = body;

    const newFeature = await db.FeatureEquipoEspecial.create({
      nombre,
      descripcion,
      tipoValorEsperado,
      esRequerido,
      orden: orden || 0,
      parentFeatureId: parentFeatureId || null,
    }, { transaction });

    await transaction.commit(); // Confirmar la operación

    return NextResponse.json(newFeature, { status: 201 });
  } catch (error) {
    await transaction.rollback(); // Revertir la transacción si falla
    console.error('Error al crear feature de equipo especial:', error.message);
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
      { message: 'Error interno del servidor al crear feature.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}