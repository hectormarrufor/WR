// app/api/equiposEspeciales/route.js
import { NextResponse } from 'next/server';
import db from '../../../models';

// GET todos los Equipos Especiales (ahora con filtrado y orden opcionales)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipoEquipoEspecialId = searchParams.get('tipoEquipoEspecialId'); // Obtener ID de tipo desde query param
    const limit = searchParams.get('limit');
    const orderBy = searchParams.get('orderBy'); // Ej: 'createdAt:desc'

    const whereClause = {};
    if (tipoEquipoEspecialId) {
      whereClause.tipoEquipoEspecialId = parseInt(tipoEquipoEspecialId);
    }

    const orderClause = [];
    if (orderBy) {
        const [field, direction] = orderBy.split(':');
        orderClause.push([field, direction.toUpperCase()]);
    } else {
        orderClause.push(['createdAt', 'DESC']); // Orden por defecto
    }

    const findOptions = {
      where: whereClause,
      include: [
        { model: db.FichaTecnicaEquipoEspecial, as: 'fichaTecnica' },
        { model: db.Vehiculo, as: 'vehiculoRemolque' },
        { model: db.TipoEquipoEspecial, as: 'tipoEquipo' }, // Incluir el objeto tipoEquipo para el nombre
      ],
      order: orderClause,
      limit: limit ? parseInt(limit) : undefined, // Aplicar límite si se especifica
    };

    const equiposEspeciales = await db.EquipoEspecial.findAll(findOptions);
    return NextResponse.json(equiposEspeciales, { status: 200 });
  } catch (error) {
    console.error('Error al obtener equipos especiales:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener equipos especiales.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// POST un nuevo Equipo Especial (sin cambios en esta parte para esta solicitud)
export async function POST(request) {
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { 
      nombre, 
      numeroSerie, 
      placa, 
      tipoEquipoEspecialId, // Ahora es un ID
      horometroActual, 
      kilometrajeActual, 
      estadoOperativoGeneral, 
      esMovil, 
      vehiculoRemolqueId,
      propiedades 
    } = body; 

    const nuevoEquipoEspecial = await db.EquipoEspecial.create({
      nombre,
      numeroSerie,
      placa: placa || null,
      tipoEquipoEspecialId: parseInt(tipoEquipoEspecialId), // Asegurar parseo a entero
      horometroActual: parseInt(horometroActual),
      kilometrajeActual: parseInt(kilometrajeActual || 0),
      estadoOperativoGeneral,
      esMovil,
      vehiculoRemolqueId: vehiculoRemolqueId || null,
    }, { transaction });

    await db.FichaTecnicaEquipoEspecial.create({
      equipoEspecialId: nuevoEquipoEspecial.id,
      propiedades: propiedades || {},
    }, { transaction });

    await transaction.commit();

    return NextResponse.json(nuevoEquipoEspecial, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear equipo especial:', error.message);
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
          message: `Ya existe un equipo especial con el mismo '${field}': ${value}.`,
          type: 'UniqueConstraintError',
          field: field,
          value: value,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al crear equipo especial.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}