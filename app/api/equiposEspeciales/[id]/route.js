// app/api/equiposEspeciales/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../models'; // Asegúrate que la ruta a tu 'models/index.js' es correcta

// GET un Equipo Especial por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const equipoEspecial = await db.EquipoEspecial.findByPk(id, {
      include: [
        { model: db.FichaTecnicaEquipoEspecial, as: 'fichaTecnica' }, // Incluir su ficha técnica especializada con propiedades dinámicas
        { model: db.Vehiculo, as: 'vehiculoRemolque' }, // Si tiene un vehículo de remolque asociado
      ],
    });

    if (!equipoEspecial) {
      return NextResponse.json(
        { message: 'Equipo especial no encontrado.', type: 'NotFound' },
        { status: 404 }
      );
    }

    return NextResponse.json(equipoEspecial, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener equipo especial con ID ${id}:`, error.message);
    return NextResponse.json(
      {
        message: 'Error interno del servidor al obtener equipo especial.',
        type: 'ServerError',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) un Equipo Especial por ID
export async function PUT(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction(); // Iniciar una transacción
  try {
    const body = await request.json();
    // Separar los campos fijos de EquipoEspecial de las propiedades dinámicas
    const { 
      propiedades, // Propiedades dinámicas para la ficha técnica
      ...equipoEspecialData // Los campos fijos de EquipoEspecial
    } = body; 

    const equipoEspecial = await db.EquipoEspecial.findByPk(id, { transaction });

    if (!equipoEspecial) {
      await transaction.rollback();
      return NextResponse.json(
        { message: 'Equipo especial no encontrado.', type: 'NotFound' },
        { status: 404 }
      );
    }

    // 1. Actualizar los campos fijos del Equipo Especial principal
    await equipoEspecial.update({
      ...equipoEspecialData,
      horometroActual: parseInt(equipoEspecialData.horometroActual),
      kilometrajeActual: parseInt(equipoEspecialData.kilometrajeActual || 0),
      // Asegurarse de que vehiculoRemolqueId se parsee a número o sea null
      vehiculoRemolqueId: equipoEspecialData.vehiculoRemolqueId ? parseInt(equipoEspecialData.vehiculoRemolqueId) : null,
    }, { transaction });

    // 2. Actualizar la Ficha Técnica especializada asociada con las propiedades dinámicas
    let fichaTecnicaExistente = await db.FichaTecnicaEquipoEspecial.findOne({
      where: { equipoEspecialId: equipoEspecial.id },
      transaction,
    });

    if (fichaTecnicaExistente) {
      // Actualizar el campo 'propiedades' (JSONB)
      await fichaTecnicaExistente.update({
        propiedades: propiedades || {}, // Guardar las propiedades dinámicas (JSONB)
      }, { transaction });
    } else {
      // Si no existe, crear una nueva (esto podría pasar si se creó el equipo antes de que tuvieran FT)
      fichaTecnicaExistente = await db.FichaTecnicaEquipoEspecial.create({
        equipoEspecialId: equipoEspecial.id,
        propiedades: propiedades || {},
      }, { transaction });
    }

    await transaction.commit(); // Confirmar todas las operaciones

    // Recargar el equipo especial con la ficha técnica actualizada para la respuesta
    const updatedEquipoEspecial = await db.EquipoEspecial.findByPk(id, {
      include: [{ model: db.FichaTecnicaEquipoEspecial, as: 'fichaTecnica' }],
    });

    return NextResponse.json(
      { message: 'Equipo especial actualizado exitosamente.', equipoEspecial: updatedEquipoEspecial },
      { status: 200 }
    );
  } catch (error) {
    await transaction.rollback(); // Revertir la transacción si falla
    console.error(`Error al actualizar equipo especial con ID ${id}:`, error.message);
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
      { message: 'Error interno del servidor al actualizar equipo especial.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE un Equipo Especial por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction(); // Iniciar una transacción
  try {
    const equipoEspecial = await db.EquipoEspecial.findByPk(id, { transaction });

    if (!equipoEspecial) {
      await transaction.rollback();
      return NextResponse.json(
        { message: 'Equipo especial no encontrado.', type: 'NotFound' },
        { status: 404 }
      );
    }

    // 1. Eliminar la Ficha Técnica asociada primero para evitar errores de FK
    await db.FichaTecnicaEquipoEspecial.destroy({
      where: { equipoEspecialId: equipoEspecial.id },
      transaction,
    });

    // 2. Eliminar el Equipo Especial
    await equipoEspecial.destroy({ transaction });

    await transaction.commit(); // Confirmar todas las operaciones

    return NextResponse.json(
      { message: 'Equipo especial eliminado exitosamente.' },
      { status: 200 }
    );
  } catch (error) {
    await transaction.rollback(); // Revertir la transacción si falla
    console.error(`Error al eliminar equipo especial con ID ${id}:`, error.message);
    return NextResponse.json(
      {
        message: 'Error interno del servidor al eliminar equipo especial.',
        type: 'ServerError',
        details: error.message,
      },
      { status: 500 }
    );
  }
}