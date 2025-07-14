import {EstadoSistemaVehiculo, Mantenimiento, Vehiculo} from "../../../models";

/**
 * Recalcula y actualiza el estado operativo general de un vehículo
 * basándose en los estados de sus sistemas y órdenes de mantenimiento.
 * @param {number} vehiculoId - El ID del vehículo a recalcular.
 * @param {object} [transaction=null] - Una transacción de Sequelize opcional.
 */
export async function recalcularEstadoGeneralVehiculo(vehiculoId, transaction = null) {
  try {
    const sistemas = await EstadoSistemaVehiculo.findAll({
      where: { vehiculoId: vehiculoId },
      transaction: transaction
    });

    let nuevoEstadoGeneral = 'Operativo'; // Punto de partida optimista

    // Regla 1: Si hay algún sistema con 'Fallo Crítico', el vehículo no es operativo
    if (sistemas.some(s => s.estado === 'Fallo Crítico')) {
      nuevoEstadoGeneral = 'No Operativo';
    } else if (sistemas.some(s => s.estado === 'Advertencia')) {
      // Regla 2: Si no hay fallos críticos, pero hay advertencias
      nuevoEstadoGeneral = 'Operativo con Advertencias';
    } else if (sistemas.length > 0 && sistemas.every(s => s.estado === 'No Aplica')) {
      // Regla 3: Si todos los sistemas registrados son 'No Aplica'
      nuevoEstadoGeneral = 'Desconocido';
    } else if (sistemas.length === 0) {
        // Regla 4: Si no hay estados de sistema registrados (vehículo nuevo, etc.)
        nuevoEstadoGeneral = 'Desconocido';
    }


    // Regla 5: Si el vehículo tiene órdenes de mantenimiento abiertas o en progreso, podría estar "En Taller"
    const ordenesAbiertas = await Mantenimiento.count({
      where: {
        vehiculoId: vehiculoId,
        estadoOrden: ['Abierta', 'En Progreso']
      },
      transaction: transaction
    });

    // Sobrescribe si ya es 'No Operativo', pero lo pone 'En Taller' si está en 'Operativo' o 'Advertencias'
    if (ordenesAbiertas > 0 && nuevoEstadoGeneral !== 'No Operativo') {
      nuevoEstadoGeneral = 'En Taller';
    }

    // Finalmente, actualiza el campo en el modelo Vehiculo
    await Vehiculo.update(
      { estadoOperativoGeneral: nuevoEstadoGeneral },
      { where: { id: vehiculoId }, transaction: transaction }
    );
  } catch (error) {
    console.error(`Error al recalcular estado general para el vehículo ${vehiculoId}:`, error);
    // Relanza el error para que la transacción principal pueda hacer rollback
    throw error;
  }
}