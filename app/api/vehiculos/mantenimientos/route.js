// app/api/mantenimientos/route.js
import { NextResponse } from 'next/server';
import db, {Mantenimiento, Vehiculo} from '../../../../models';
import { recalcularEstadoGeneralVehiculo } from '../recalcularEstadoGeneral';
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
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { vehiculoId, fechaInicio, descripcionGeneral, responsableId, kilometrajeMantenimiento, horometroMantenimiento, tareas } = body;

    // Determinar el tipo de mantenimiento general basado en las tareas
    let tipoMantenimientoGeneral = 'Preventivo'; // Valor por defecto
    if (tareas && tareas.length > 0) {
      if (tareas.some(tarea => tarea.tipo === 'Correctivo')) {
        tipoMantenimientoGeneral = 'Correctivo';
      } else if (tareas.some(tarea => tarea.tipo === 'Predictivo')) {
        tipoMantenimientoGeneral = 'Predictivo'; // Predictivo tiene menos prioridad que correctivo si ambos existen
      }
    }
    // Si no hay tareas o todas son preventivas, se mantiene 'Preventivo'

    // Crear el mantenimiento principal
    const nuevoMantenimiento = await db.Mantenimiento.create({
      vehiculoId,
      tipo: tipoMantenimientoGeneral, // Usar el tipo determinado por las tareas
      estado: 'Pendiente', // Siempre Pendiente al crear
      fechaInicio,
      descripcionGeneral,
      responsableId,
      kilometrajeMantenimiento,
      horometroMantenimiento,
    }, { transaction });

    // Crear las tareas de mantenimiento asociadas
    if (tareas && tareas.length > 0) {
      const tareasParaCrear = tareas.map(tarea => ({
        ...tarea,
        mantenimientoId: nuevoMantenimiento.id,
      }));
      await db.TareaMantenimiento.bulkCreate(tareasParaCrear, { transaction });
    }

    await recalcularEstadoGeneralVehiculo(vehiculoId, transaction);

    await transaction.commit();
    return NextResponse.json(nuevoMantenimiento, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear orden de mantenimiento:', error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return NextResponse.json(
        { message: 'ID de vehículo, responsable o tarea no válido.', type: 'ForeignKeyConstraintError' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al crear orden de mantenimiento.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}