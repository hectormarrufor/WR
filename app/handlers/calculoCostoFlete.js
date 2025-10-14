// formula: Costo Total del Flete = [(CF / VM) + (CV / VKM) + DC + CVP] × D × (1 + PG)

export function calcularCostoFlete({
  gastosFijosMensuales,     // CF
  viajesMensuales,          // VM
  gastosVariablesMensuales, // CV
  kmMensuales,              // VKM
  desgasteCauchoPorKm,      // DC
  consumoPorPesoKm,         // CVP
  distanciaKm,              // D
  porcentajeGanancia        // PG (ej. 0.25 para 25%)
}) {
  // Validaciones básicas
  if (viajesMensuales <= 0 || kmMensuales <= 0 || distanciaKm <= 0) {
    throw new Error("Los valores de viajes, kilómetros y distancia deben ser mayores a cero.");
  }

  // Cálculo de componentes
  const costoFijoPorViaje = gastosFijosMensuales / viajesMensuales;
  const costoVariablePorKm = gastosVariablesMensuales / kmMensuales;

  // Costo base por km
  const costoPorKm = costoFijoPorViaje + costoVariablePorKm + desgasteCauchoPorKm + consumoPorPesoKm;

  // Costo total sin ganancia
  const costoBase = costoPorKm * distanciaKm;

  // Costo total con ganancia
  const costoTotal = costoBase * (1 + porcentajeGanancia);

  return parseFloat(costoTotal.toFixed(2)); // Redondeado a 2 decimales
}
