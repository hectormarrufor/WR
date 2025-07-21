// app/api/vehiculos/inspecciones/route.js
import { NextResponse } from 'next/server';
import db from '../../../../models';
import { recalcularEstadoGeneralVehiculo } from '../recalcularEstadoGeneral'; // Importa la función de ayuda

// GET todas las inspecciones
export async function GET() {
  try {
    const inspecciones = await db.Inspeccion.findAll({
      include: [
        { model: db.Vehiculo, as: 'vehiculo' },
        { model: db.HallazgoInspeccion, as: 'hallazgos' }, // Incluye hallazgos
        // { model: db.EstadoSistemaVehiculo, as: 'estadosSistemas' }, // Si quieres incluirlos aquí directamente
      ],
      order: [['fechaInspeccion', 'DESC']], // Ordenar para que la más reciente sea la primera
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
  const transaction = await db.sequelize.transaction(); // Iniciar una transacción
  try {
    const body = await request.json();
    const { vehiculoId, fechaInspeccion, kilometrajeInspeccion, horometro, inspector, observacionesGenerales, estadosSistemas } = body;

    // 1. Crear la Inspección principal
    const nuevaInspeccion = await db.Inspeccion.create({
      vehiculoId,
      fechaInspeccion,
      kilometrajeInspeccion,
      horometro,
      inspector,
      observacionesGenerales,
      // Los campos de bombillos, filtros, etc. del modelo Inspeccion original (si aún los usas)
      // tendrían que mapearse aquí desde el 'body' si los recoges del frontend.
      // Por ejemplo:
      // bombilloDelBaja: body.bombillos.delBaja,
      // filtroAireOk: body.filtros.aireOk,
      // etc.
      // Pero si la idea es usar `estadosSistemas` y `HallazgoInspeccion` para esos detalles,
      // esos campos directos en Inspeccion podrían ser redundantes o solo para un resumen.
    }, { transaction });

    // 2. Procesar los estados de los sistemas y crear Hallazgos
    // y actualizar/crear EstadoSistemaVehiculo para cada sistema
    if (estadosSistemas && estadosSistemas.length > 0) {
        for (const sistema of estadosSistemas) {
            const { nombreSistema, estado, notas } = sistema;

            // Actualizar o crear el registro de EstadoSistemaVehiculo para este sistema en el vehículo
            // Busca la última entrada para este sistema en este vehículo
            let estadoVehiculo = await db.EstadoSistemaVehiculo.findOne({
                where: { vehiculoId, nombreSistema },
                order: [['fechaActualizacion', 'DESC']],
                transaction,
            });

            if (estadoVehiculo) {
                // Si existe, actualiza su estado
                await estadoVehiculo.update({
                    estado,
                    notas,
                    fechaActualizacion: new Date(),
                    // Puedes vincularlo a la inspección que lo generó (hallazgoInspeccionId) si el hallazgo existe
                }, { transaction });
            } else {
                // Si no existe, crea uno nuevo
                estadoVehiculo = await db.EstadoSistemaVehiculo.create({
                    vehiculoId,
                    nombreSistema,
                    estado,
                    notas,
                    fechaActualizacion: new Date(),
                }, { transaction });
            }

            // Si el estado no es 'Operativo' o 'No Aplica', crea un HallazgoInspeccion
            if (estado !== 'Operativo' && estado !== 'No Aplica') {
                await db.HallazgoInspeccion.create({
                    vehiculoId,
                    inspeccionId: nuevaInspeccion.id,
                    descripcion: notas || `Problema detectado en ${nombreSistema} (Estado: ${estado}).`,
                    gravedad: estado === 'Fallo Crítico' ? 'Crítica' : 'Media', // O mapear más detalladamente
                    estaResuelto: false, // Por defecto, un nuevo hallazgo no está resuelto
                }, { transaction });
            }
        }
    }

    // 3. Recalcular el estado operativo general del vehículo
    await recalcularEstadoGeneralVehiculo(vehiculoId, transaction);

    await transaction.commit(); // Confirmar todas las operaciones si todo fue exitoso

    return NextResponse.json(nuevaInspeccion, { status: 201 });
  } catch (error) {
    await transaction.rollback(); // Revertir la transacción si ocurre algún error
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