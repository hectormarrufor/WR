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
  
      let tipoMantenimientoGeneral = 'Preventivo';
      if (tareas && tareas.length > 0) {
        if (tareas.some(tarea => tarea.tipo === 'Correctivo')) {
          tipoMantenimientoGeneral = 'Correctivo';
        } else if (tareas.some(tarea => tarea.tipo === 'Predictivo')) {
          tipoMantenimientoGeneral = 'Predictivo';
        }
      }
  
      const nuevoMantenimiento = await db.Mantenimiento.create({
        vehiculoId,
        tipo: tipoMantenimientoGeneral,
        estado: 'Pendiente',
        fechaInicio,
        descripcionGeneral,
        responsableId,
        kilometrajeMantenimiento,
        horometroMantenimiento,
      }, { transaction });
  
      const hallazgosIdsAsignados = [];
      if (tareas && tareas.length > 0) {
        const tareasParaCrear = tareas.map(tarea => {
          if (tarea.hallazgoInspeccionId) {
            hallazgosIdsAsignados.push(tarea.hallazgoInspeccionId);
          }
          return {
            ...tarea,
            mantenimientoId: nuevoMantenimiento.id,
          };
        });
        await db.TareaMantenimiento.bulkCreate(tareasParaCrear, { transaction });
      }
  
      // Marcar hallazgos como 'Asignado'
      if (hallazgosIdsAsignados.length > 0) {
        await db.HallazgoInspeccion.update(
          { estado: 'Asignado' },
          { where: { id: hallazgosIdsAsignados, estado: 'Pendiente' }, transaction } // Solo si están Pendientes
        );
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