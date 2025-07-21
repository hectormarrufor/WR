// app/api/vehiculos/recalcularEstadoGeneral.js
import db from '../../../models'; // Asegúrate que la ruta a tu 'models/index.js' es correcta

export const recalcularEstadoGeneralVehiculo = async (vehiculoId, transaction = null) => {
  try {
    let newEstadoGeneral = 'Operativo'; // Estado por defecto

    // 1. Obtener los últimos estados de los sistemas del vehículo
    const estadosSistemas = await db.EstadoSistemaVehiculo.findAll({
      where: { vehiculoId },
      transaction,
    });

    // 2. Obtener todos los hallazgos de inspección pendientes (no resueltos)
    const hallazgosPendientes = await db.HallazgoInspeccion.findAll({
      where: {
        vehiculoId,
        estaResuelto: false,
      },
      transaction,
    });

    // 3. Evaluar el estado basado en los EstadosSistemaVehiculo
    let tieneAdvertenciasDeSistema = false;
    for (const estadoSistema of estadosSistemas) {
      if (estadoSistema.estado === 'Fallo Crítico') {
        newEstadoGeneral = 'No Operativo'; // Un fallo crítico en cualquier sistema lo hace NO OPERATIVO
        break; // No necesitamos revisar más si ya encontramos un fallo crítico
      } else if (estadoSistema.estado === 'Advertencia') {
        tieneAdvertenciasDeSistema = true;
      }
    }

    // 4. Evaluar el estado basado en los Hallazgos de Inspección pendientes
    let tieneAdvertenciasDeHallazgo = false;
    for (const hallazgo of hallazgosPendientes) {
      if (hallazgo.gravedad === 'Crítica') {
        newEstadoGeneral = 'No Operativo'; // Un hallazgo crítico pendiente lo hace NO OPERATIVO
        break; // No necesitamos revisar más si ya encontramos un hallazgo crítico
      } else if (hallazgo.gravedad === 'Media' || hallazgo.gravedad === 'Baja') {
        tieneAdvertenciasDeHallazgo = true;
      }
    }

    // Si ya es 'No Operativo' por alguna de las razones anteriores, se mantiene.
    // Si no es 'No Operativo', pero tiene advertencias, se pone en 'Operativo con Advertencias'.
    if (newEstadoGeneral === 'Operativo') {
      if (tieneAdvertenciasDeSistema || tieneAdvertenciasDeHallazgo) {
        newEstadoGeneral = 'Operativo con Advertencias';
      }
    }

    // Opcional: Considerar el estado del vehículo si está en taller.
    // Podrías tener un campo `enTaller` en el modelo Vehiculo o similar
    // const vehiculo = await db.Vehiculo.findByPk(vehiculoId, { transaction });
    // if (vehiculo.enTaller) {
    //   newEstadoGeneral = 'En Taller';
    // }

    // Actualizar el campo estadoOperativoGeneral en el modelo Vehiculo
    await db.Vehiculo.update(
      { estadoOperativoGeneral: newEstadoGeneral },
      { where: { id: vehiculoId }, transaction }
    );

    console.log(`Estado operativo general del vehículo ${vehiculoId} actualizado a: ${newEstadoGeneral}`);
    return newEstadoGeneral;

  } catch (error) {
    console.error(`Error al recalcular estado general del vehículo ${vehiculoId}:`, error.message);
    throw error; // Re-lanzar el error para que la transacción se revierta
  }
};