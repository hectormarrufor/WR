import db from "../../../models";

export const recalcularEstadoGeneralVehiculo = async (vehiculoId, transaction = null) => {
  try {
    let newEstadoGeneral = 'Operativo'; // Estado por defecto

    // 1. Obtener todos los hallazgos de inspección pendientes o asignados
    // Estos son los que requieren una acción directa y, por ende, afectan el estado operativo.
    const hallazgosPendientesOAsignados = await db.HallazgoInspeccion.findAll({
      where: {
        vehiculoId,
        estado: {
            [db.Sequelize.Op.in]: ['Pendiente', 'Asignado'] // Solo hallazgos que aún requieren gestión
        },
      },
      transaction,
    });

    // console.log("HALLAZGOS PENDIENTEEEEEEEES: ", hallazgosPendientesOAsignados)

    // 2. Evaluar el estado general basándonos **principalmente** en estos hallazgos
    let tieneAdvertencias = false;
    for (const hallazgo of hallazgosPendientesOAsignados) {
      if (hallazgo.gravedad === 'Crítica') {
        newEstadoGeneral = 'No Operativo'; // Un hallazgo crítico PENDIENTE o ASIGNADO lo hace NO OPERATIVO
        break; // Si ya encontramos uno crítico, no necesitamos revisar más
      } else if (hallazgo.gravedad === 'Media' || hallazgo.gravedad === 'Baja') {
        tieneAdvertencias = true;
      }
    }

    // 3. Si no hay hallazgos críticos pendientes/asignados, pero sí hay advertencias
    if (newEstadoGeneral === 'Operativo' && tieneAdvertencias) {
      newEstadoGeneral = 'Operativo con Advertencias';
    }

    // Nota: El EstadoSistemaVehiculo (Fallo Crítico, Advertencia)
    // ahora se considera más como una instantánea del estado en la última inspección.
    // La determinación de "No Operativo" se basa más directamente en si hay
    // HallazgosInspeccion críticos **no resueltos ni descartados**.
    // Si deseas que el "Fallo Crítico" en EstadoSistemaVehiculo por sí solo (sin un hallazgo asociado
    // o después de que un hallazgo se resuelve) también haga el vehículo "No Operativo",
    // necesitarías una lógica más compleja que los vincule o un proceso para "restablecer"
    // EstadoSistemaVehiculo cuando un hallazgo se resuelve.
    // Pero para tu requerimiento de que "ya no hay ningún hallazgo pendiente ni nada",
    // esta lógica que se enfoca en los hallazgos pendientes/asignados es la más adecuada.

    // 4. Actualizar el campo estadoOperativoGeneral en el modelo Vehiculo
    await db.Vehiculo.update(
      { estadoOperativoGeneral: newEstadoGeneral },
      { where: { id: vehiculoId }, transaction }
    );

    console.log(`Estado operativo general del vehículo ${vehiculoId} actualizado a: ${newEstadoGeneral}`);
    return newEstadoGeneral;

  } catch (error) {
    console.error(`Error al recalcular estado general del vehículo ${vehiculoId}:`, error.message);
    throw error; // Re-lanzar el error para que la transacción se revierta si algo sale mal
  }
};