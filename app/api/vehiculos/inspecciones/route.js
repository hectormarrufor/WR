// app/api/vehiculos/inspecciones/route.js
import { NextResponse } from 'next/server';
import db from '../../../../models';
import { recalcularEstadoGeneralVehiculo } from '../recalcularEstadoGeneral';

// GET todas las inspecciones (este GET no necesita cambios para tu solicitud actual)
export async function GET() {
  try {
    const inspecciones = await db.Inspeccion.findAll({
      include: [
        { model: db.Vehiculo, as: 'vehiculo' },
        { model: db.HallazgoInspeccion, as: 'hallazgos' },
      ],
      order: [['fechaInspeccion', 'DESC']],
    });
    return NextResponse.json(inspecciones, { status: 200 });
  } catch (error) {
    console.error('Error al obtener inspecciones:', error.message);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener inspecciones.', type: 'ServerError' },
      { status: 500 }
    );
  }
}

// POST una nueva inspección con sus hallazgos y estados de sistema
export async function POST(request) {
 const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { vehiculoId, fechaInspeccion, kilometrajeInspeccion, horometro, inspector, observacionesGenerales, estadosSistemas } = body;

    // 1. Crear la Inspección principal
    const nuevaInspeccion = await db.Inspeccion.create({
      vehiculoId,
      fechaInspeccion,
      kilometrajeInspeccion: parseInt(kilometrajeInspeccion),
      horometro: parseInt(horometro),
      inspector,
      observacionesGenerales,
    }, { transaction });

    // 2. Registrar el Kilometraje de la Inspección en la tabla Kilometrajes
    if (kilometrajeInspeccion !== undefined && kilometrajeInspeccion !== null) {
      await db.Kilometraje.create({
        vehiculoId,
        kilometrajeActual: parseInt(kilometrajeInspeccion),
        fechaRegistro: fechaInspeccion, // Usar la fecha de la inspección
      }, { transaction });
    }

    // 3. Registrar el Horómetro de la Inspección en la tabla Horometros
    if (horometro !== undefined && horometro !== null) {
      await db.Horometro.create({
        vehiculoId,
        horas: parseInt(horometro),
        fecha: fechaInspeccion, // Usar la fecha de la inspección
      }, { transaction });
    }

    // Obtener la ficha técnica del vehículo para los intervalos de mantenimiento
    const vehiculoConFicha = await db.Vehiculo.findByPk(vehiculoId, {
      include: [{ model: db.FichaTecnica, as: 'fichaTecnica' }],
      transaction,
    });
    const fichaTecnica = vehiculoConFicha?.fichaTecnica;

    // --- Lógica para Hallazgos Automáticos de Cambio de Aceite ---
    // (Esta lógica se mantiene, solo se asegura de usar los valores correctos de la FichaTécnica)
    const hallazgosAutomaticos = [];

    // 1. Aceite de Motor
    if (fichaTecnica?.motor?.aceite?.ultimoCambioKm !== null && fichaTecnica?.motor?.aceite?.intervaloCambioKm !== null) {
      const proximoCambioMotorKm = parseFloat(fichaTecnica.motor.aceite.ultimoCambioKm) + parseFloat(fichaTecnica.motor.aceite.intervaloCambioKm);
      if (parseInt(kilometrajeInspeccion) >= proximoCambioMotorKm) {
        const existingMotorOilFinding = await db.HallazgoInspeccion.findOne({
          where: {
            vehiculoId,
            nombreSistema: 'Aceite de Motor',
            descripcion: 'Cambio de Aceite de Motor Requerido',
            estaResuelto: false,
          },
          transaction,
        });
        if (!existingMotorOilFinding) {
          hallazgosAutomaticos.push({
            vehiculoId,
            inspeccionId: nuevaInspeccion.id,
            nombreSistema: 'Aceite de Motor',
            descripcion: 'Cambio de Aceite de Motor Requerido',
            gravedad: 'Crítica',
            estaResuelto: false,
          });
        }
      }
    }

    // 2. Aceite de Transmisión (si la estructura existe en la ficha técnica)
    if (fichaTecnica?.transmision?.ultimoCambioKm !== null && fichaTecnica?.transmision?.intervaloCambioKm !== null) {
      const proximoCambioTransmisionKm = parseFloat(fichaTecnica.transmision.ultimoCambioKm) + parseFloat(fichaTecnica.transmision.intervaloCambioKm);
      if (parseInt(kilometrajeInspeccion) >= proximoCambioTransmisionKm) {
        const existingTransmisionOilFinding = await db.HallazgoInspeccion.findOne({
          where: {
            vehiculoId,
            nombreSistema: 'Aceite de Transmisión',
            descripcion: 'Cambio de Aceite de Transmisión Requerido',
            estaResuelto: false,
          },
          transaction,
        });
        if (!existingTransmisionOilFinding) {
          hallazgosAutomaticos.push({
            vehiculoId,
            inspeccionId: nuevaInspeccion.id,
            nombreSistema: 'Aceite de Transmisión',
            descripcion: 'Cambio de Aceite de Transmisión Requerido',
            gravedad: 'Crítica',
            estaResuelto: false,
          });
        }
      }
    }

    if (hallazgosAutomaticos.length > 0) {
      await db.HallazgoInspeccion.bulkCreate(hallazgosAutomaticos, { transaction });
    }
    // --- Fin Lógica para Hallazgos Automáticos ---

    // Procesar hallazgos manuales/reportados en la inspección (sin cambios)
    if (estadosSistemas && estadosSistemas.length > 0) {
        for (const sistema of estadosSistemas) {
            const { nombreSistema, estado, notas } = sistema;

            let estadoVehiculo = await db.EstadoSistemaVehiculo.findOne({
                where: { vehiculoId, nombreSistema },
                order: [['fechaActualizacion', 'DESC']],
                transaction,
            });

            if (estadoVehiculo) {
                await estadoVehiculo.update({
                    estado,
                    notas,
                    fechaActualizacion: new Date(),
                }, { transaction });
            } else {
                estadoVehiculo = await db.EstadoSistemaVehiculo.create({
                    vehiculoId,
                    nombreSistema,
                    estado,
                    notas,
                    fechaActualizacion: new Date(),
                }, { transaction });
            }

            if (estado !== 'Operativo' && estado !== 'No Aplica') {
                await db.HallazgoInspeccion.create({
                    vehiculoId,
                    inspeccionId: nuevaInspeccion.id,
                    nombreSistema: nombreSistema,
                    descripcion: notas || `Problema detectado en ${nombreSistema} (Estado: ${estado}).`,
                    gravedad: estado === 'Fallo Crítico' ? 'Crítica' : 'Media',
                    estaResuelto: false,
                }, { transaction });
            }
        }
    }

    await recalcularEstadoGeneralVehiculo(vehiculoId, transaction); //

    await transaction.commit();

    return NextResponse.json(nuevaInspeccion, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear inspección y hallazgos:', error.message);
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({ field: err.path, message: err.message }));
      return NextResponse.json(
        { message: 'Error de validación.', type: 'ValidationError', errors: validationErrors },
        { status: 400 }
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return NextResponse.json(
        { message: 'ID de vehículo no válido o relación inexistente.', type: 'ForeignKeyConstraintError' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: 'Error interno del servidor al crear inspección.', type: 'ServerError', details: error.message },
      { status: 500 }
    );
  }
}