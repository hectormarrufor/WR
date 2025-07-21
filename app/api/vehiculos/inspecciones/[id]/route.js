// app/api/inspecciones/[id]/route.js
import { NextResponse } from 'next/server';
import {Inspeccion, Vehiculo} from '../../../../../models';
// import { Inspeccion, Vehiculo, Usuario } from '../../../../models/flota'; // Ajusta la ruta y modelos relacionados
// GET una inspección por ID
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const inspeccion = await Inspeccion.findByPk(id, {
      include: [
        { model: Vehiculo, as: 'vehiculo' },
        // { model: Usuario, as: 'inspector' },
      ],
    });
    if (!inspeccion) {
      return NextResponse.json({ message: 'Inspección no encontrada.', type: 'NotFound' }, { status: 404 });
    }
    return NextResponse.json(inspeccion, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener inspección con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener inspección.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) una inspección por ID
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

    // --- Lógica para procesar y actualizar TareaMantenimiento ---
    if (tareas && tareas.length > 0) {
      for (const tareaActualizada of tareas) {
        const tareaExistente = mantenimiento.tareas.find(t => t.id === tareaActualizada.id);
        if (tareaExistente) {
          await tareaExistente.update({
            estado: tareaActualizada.estado,
            fechaInicio: tareaActualizada.fechaInicio,
            fechaFin: tareaActualizada.fechaFin,
            // Asegúrate de actualizar el tipo de tarea si se permite editar
            // tipo: tareaActualizada.tipo,
          }, { transaction });
        } else if (!tareaActualizada.id) {
          await db.TareaMantenimiento.create({
            ...tareaActualizada,
            mantenimientoId: mantenimiento.id,
          }, { transaction });
        }
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

      // 1. Registrar Kilometraje y Horómetro de la Completación de Mantenimiento (si son valores válidos y recientes)
      if (currentKm > 0) { // Solo registrar si es un valor significativo
        const ultimoKilometraje = vehiculo.kilometrajes?.[0]?.kilometrajeActual || 0;
        if (currentKm > ultimoKilometraje) { // Registrar solo si es un nuevo valor más alto
          await db.Kilometraje.create({
            vehiculoId: vehiculo.id,
            kilometrajeActual: currentKm,
            fechaRegistro: new Date(), // O fechaCompletado si viene en el body
          }, { transaction });
        }
      }
      if (currentHorometro > 0) { // Solo registrar si es un valor significativo
        const ultimoHorometro = vehiculo.horometros?.[0]?.horas || 0;
        if (currentHorometro > ultimoHorometro) { // Registrar solo si es un nuevo valor más alto
          await db.Horometro.create({
            vehiculoId: vehiculo.id,
            horas: currentHorometro,
            fecha: new Date(), // O fechaCompletado
          }, { transaction });
        }
      }

      // 2. Lógica de Actualización de Ficha Técnica y Resolución de Hallazgos
      for (const tarea of updatedMantenimiento.tareas) {
        if (tarea.estado === 'Completada') { // Solo procesar tareas completadas
            if (tarea.nombre === 'Cambio de Aceite de Motor' || tarea.tipo === 'Cambio de Aceite de Motor') {
                if (fichaTecnica.motor && fichaTecnica.motor.aceite) {
                fichaTecnica.motor.aceite.ultimoCambioKm = currentKm;
                fichaTecnica.motor.aceite.ultimoCambioHoras = currentHorometro;
                }
                await db.HallazgoInspeccion.update(
                { estaResuelto: true, fechaResolucion: new Date() },
                {
                    where: {
                    vehiculoId: vehiculo.id,
                    nombreSistema: 'Aceite de Motor',
                    descripcion: 'Cambio de Aceite de Motor Requerido',
                    estaResuelto: false,
                    },
                    transaction,
                }
                );
            } else if (tarea.nombre === 'Cambio de Aceite de Transmisión' || tarea.tipo === 'Cambio de Aceite de Transmisión') {
                if (fichaTecnica.transmision && fichaTecnica.transmision.aceite) {
                fichaTecnica.transmision.aceite.ultimoCambioKm = currentKm;
                fichaTecnica.transmision.aceite.ultimoCambioHoras = currentHorometro;
                }
                await db.HallazgoInspeccion.update(
                { estaResuelto: true, fechaResolucion: new Date() },
                {
                    where: {
                    vehiculoId: vehiculo.id,
                    nombreSistema: 'Aceite de Transmisión',
                    descripcion: 'Cambio de Aceite de Transmisión Requerido',
                    estaResuelto: false,
                    },
                    transaction,
                }
                );
            }
        }
      }

      await fichaTecnica.save({ transaction });
    }

    await recalcularEstadoGeneralVehiculo(mantenimiento.vehiculoId, transaction); //

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

// DELETE una inspección por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const inspeccion = await Inspeccion.findByPk(id);
    if (!inspeccion) {
      return NextResponse.json({ message: 'Inspección no encontrada.', type: 'NotFound' }, { status: 404 });
    }
    await inspeccion.destroy();
    return NextResponse.json({ message: 'Inspección eliminada exitosamente.' }, { status: 200 });
  } catch (error) {
    console.error(`Error al eliminar inspección con ID ${id}:`, error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar inspección.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}