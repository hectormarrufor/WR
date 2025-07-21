// app/api/vehiculos/mantenimientos/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models'; // Asegúrate que la ruta a tu 'models/index.js' es correcta
import { recalcularEstadoGeneralVehiculo } from '../../recalcularEstadoGeneral';

// GET un mantenimiento por ID (sin cambios en esta parte para esta solicitud)
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const mantenimiento = await db.Mantenimiento.findByPk(id, {
      include: [
        {
          model: db.Vehiculo,
          as: 'vehiculo',
          include: [{ model: db.FichaTecnica, as: 'fichaTecnica' }] // Incluir FichaTecnica del vehículo
        },
        { model: db.TareaMantenimiento, as: 'tareas' }, // Incluir las tareas de mantenimiento
      ],
    });
    if (!mantenimiento) {
      return NextResponse.json({ message: 'Mantenimiento no encontrado.', type: 'NotFound' }, { status: 404 });
    }
    return NextResponse.json(mantenimiento, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener mantenimiento con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener mantenimiento.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) un mantenimiento por ID
export async function PUT(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { estado, fechaCompletado, kilometrajeMantenimiento, horometroMantenimiento, tareas } = body;

    const mantenimiento = await db.Mantenimiento.findByPk(id, {
      include: [
        {
          model: db.Vehiculo,
          as: 'vehiculo',
          include: [{ model: db.FichaTecnica, as: 'fichaTecnica' }]
        },
        { model: db.TareaMantenimiento, as: 'tareas' },
      ],
      transaction,
    });

    if (!mantenimiento) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Mantenimiento no encontrado.', type: 'NotFound' }, { status: 404 });
    }

    const oldEstado = mantenimiento.estado;

    await mantenimiento.update(body, { transaction });

    const hallazgosAResolver = [];
    const tareasParaCrear = [];

    if (tareas && tareas.length > 0) {
      for (const tareaActualizada of tareas) {
        const tareaExistente = mantenimiento.tareas.find(t => t.id === tareaActualizada.id);
        if (tareaExistente) {
          await tareaExistente.update({
            estado: tareaActualizada.estado,
            fechaInicio: tareaActualizada.fechaInicio,
            fechaFin: tareaActualizada.fechaFin,
            // Mantener el hallazgoInspeccionId si ya existe
            hallazgoInspeccionId: tareaExistente.hallazgoInspeccionId || tareaActualizada.hallazgoInspeccionId,
          }, { transaction });

          // Si la tarea existente fue marcada como COMPLETADA y tiene un hallazgo asociado
          if (tareaActualizada.estado === 'Completada' && tareaExistente.estado !== 'Completada' && tareaExistente.hallazgoInspeccionId) {
              hallazgosAResolver.push(tareaExistente.hallazgoInspeccionId);
          }
        } else if (!tareaActualizada.id) {
          tareasParaCrear.push({
            ...tareaActualizada,
            mantenimientoId: mantenimiento.id,
          });
        }
      }
      if (tareasParaCrear.length > 0) {
        await db.TareaMantenimiento.bulkCreate(tareasParaCrear, { transaction });
      }
    }

    const updatedMantenimiento = await db.Mantenimiento.findByPk(id, {
        include: [
            {
                model: db.Vehiculo,
                as: 'vehiculo',
                include: [{ model: db.FichaTecnica, as: 'fichaTecnica' }]
            },
            { model: db.TareaMantenimiento, as: 'tareas' },
        ],
        transaction,
    });

    const vehiculo = updatedMantenimiento.vehiculo;
    const fichaTecnica = vehiculo?.fichaTecnica;

    if (!vehiculo || !fichaTecnica) {
      console.warn(`No se pudo encontrar el vehículo o ficha técnica para mantenimiento ${id}`);
    } else {
      const currentKm = kilometrajeMantenimiento || vehiculo.kilometrajes?.[0]?.kilometrajeActual || 0;
      const currentHorometro = horometroMantenimiento || vehiculo.horometros?.[0]?.horas || 0;

      if (currentKm > 0) {
        const ultimoKilometraje = vehiculo.kilometrajes?.[0]?.kilometrajeActual || 0;
        if (currentKm > ultimoKilometraje) {
          await db.Kilometraje.create({
            vehiculoId: vehiculo.id,
            kilometrajeActual: currentKm,
            fechaRegistro: new Date(),
          }, { transaction });
        }
      }
      if (currentHorometro > 0) {
        const ultimoHorometro = vehiculo.horometros?.[0]?.horas || 0;
        if (currentHorometro > ultimoHorometro) {
          await db.Horometro.create({
            vehiculoId: vehiculo.id,
            horas: currentHorometro,
            fecha: new Date(),
          }, { transaction });
        }
      }

      // Lógica de Actualización de Ficha Técnica (solo para cambios de aceite específicos)
      for (const tarea of updatedMantenimiento.tareas) {
        if (tarea.estado === 'Completada') {
            if (tarea.nombre === 'Cambio de Aceite de Motor' || tarea.tipo === 'Cambio de Aceite de Motor') {
                if (fichaTecnica.motor && fichaTecnica.motor.aceite) {
                fichaTecnica.motor.aceite.ultimoCambioKm = currentKm;
                fichaTecnica.motor.aceite.ultimoCambioHoras = currentHorometro;
                }
            } else if (tarea.nombre === 'Cambio de Aceite de Transmisión' || tarea.tipo === 'Cambio de Aceite de Transmisión') {
                if (fichaTecnica.transmision) {
                fichaTecnica.transmision.ultimoCambioKm = currentKm;
                fichaTecnica.transmision.ultimoCambioHoras = currentHorometro;
                }
            }
        }
      }

      // Resolver los hallazgos acumulados desde el inicio de la actualización de tareas
      // Esto resuelve los hallazgos vinculados a CUALQUIER tarea que se haya completado en esta operación PUT
      if (hallazgosAResolver.length > 0) {
          await db.HallazgoInspeccion.update(
              { estado: 'Resuelto', estaResuelto: true, fechaResolucion: new Date() }, // <-- CAMBIO AQUÍ: Actualiza estado y estaResuelto
              {
                  where: {
                      id: hallazgosAResolver,
                      estado: { [db.Sequelize.Op.in]: ['Pendiente', 'Asignado'] }, // Solo si están Pendientes o Asignados
                  },
                  transaction,
              }
          );
      }

      await fichaTecnica.save({ transaction });
    }

    await recalcularEstadoGeneralVehiculo(mantenimiento.vehiculoId, transaction);

    await transaction.commit();

    return NextResponse.json({ message: 'Mantenimiento actualizado exitosamente.', mantenimiento: updatedMantenimiento }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error(`Error al actualizar mantenimiento con ID ${id}:`, error.message);
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
      { message: 'Error interno del servidor al actualizar mantenimiento.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}
// DELETE un mantenimiento por ID (sin cambios en esta parte para esta solicitud)
export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const mantenimiento = await db.Mantenimiento.findByPk(id);

    if (!mantenimiento) {
      return NextResponse.json(
        { message: 'Mantenimiento no encontrado.', type: 'NotFound' },
        { status: 404 }
      );
    }

    await mantenimiento.destroy();
    return NextResponse.json(
      { message: 'Mantenimiento eliminado exitosamente.' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error al eliminar mantenimiento con ID ${id}:`, error.message);
    return NextResponse.json(
      {
        message: 'Error interno del servidor al eliminar mantenimiento.',
        type: 'ServerError',
        details: error.message,
      },
      { status: 500 }
    );
  }
}