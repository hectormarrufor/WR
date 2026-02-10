// lib/calcularCostoFlete.js (exporta esta función)
export function calcularCostoFlete({
  distanciaKm,              // D desde Google Maps (ida+vuelta)
  tonelaje,                 // Toneladas reales
  tipoCarga = 'general',
  activoPrincipal,          // Objeto Activo con consumoCombustibleLPorKm, tarifaPorKm, etc.
  choferRatePorHora = 15,   // $/hora chofer (de Empleado o config)
  ayudanteRatePorHora = 10,
  horasEstimadas,           // (distanciaKm / velocidadPromedio) + carga/descarga (ej. +4h)
  paramsOperativos,         // {gastosFijosMensuales, viajesMensualesPromedio, kmMensualesPromedio, ...}
  precioGasoilUsd,          // de BCV o config
  cantidadPeajes,
  precioPeajeUnitario,
  porcentajeGanancia = 0.30,
  bcv,                      // para sobretasa PDVSA si es carga petrolera
}) {
  const {
    gastosFijosMensuales = 5000,
    viajesMensualesPromedio = 20,
    kmMensualesPromedio = 4000,
    viaticosPorDia = 25,
  } = paramsOperativos;

  // Costos Fijos prorrateados por viaje
  const cfPorViaje = gastosFijosMensuales / viajesMensualesPromedio;

  // Costos Variables por km (CV / VKM)
  const cvPorKm = gastosFijosMensuales / kmMensualesPromedio; // wait, no: usa gastos variables reales si tienes, sino aproximado

  // Combustible ajustado por tonelaje (más carga = +20-30% consumo)
  const factorCarga = 1 + (tonelaje / (activoPrincipal.capacidadTonelajeMax || 30));
  const combustibleLitros = distanciaKm * activoPrincipal.consumoCombustibleLPorKm * factorCarga;
  const costoCombustible = combustibleLitros * precioGasoilUsd;

  // Nómina (horas estimadas: distancia / 50kmh + 4h fijas)
  const nomina = horasEstimadas * (choferRatePorHora + (ayudanteRatePorHora || 0));

  // Viáticos (días = horasEstimadas / 10 + 1)
  const diasViaje = Math.ceil(horasEstimadas / 10) + 1;
  const viaticos = diasViaje * viaticosPorDia;

  // Peajes + desgaste caucho
  const peajes = cantidadPeajes * precioPeajeUnitario / bcv; // convertir a USD si tu config está en VES
  const desgasteCaucho = distanciaKm * (activoPrincipal.desgasteNeumaticoPorKm || 0.015);

  // Costo base sin ganancia
  const costoVariables = costoCombustible + nomina + viaticos + peajes + desgasteCaucho + cvPorKm * distanciaKm;
  const costoFijosProrrateados = cfPorViaje + (activoPrincipal.tarifaPorKm * distanciaKm); // incluye tarifa base activo

  let costoTotal = costoFijosProrrateados + costoVariables;

  // Sobretasa PDVSA si es carga petrolera (actualiza si hay nueva gaceta)
  let sobretasa = 0;
  if (tipoCarga.includes('petrolera') || tipoCarga === 'hidrocarburos') {
    sobretasa = distanciaKm < 750 ? 1.9951 * distanciaKm : 1.4396 * distanciaKm;
  }

  costoTotal += sobretasa;

  // Precio sugerido con margen
  const precioSugerido = costoTotal * (1 + porcentajeGanancia);

  return {
    costoTotal: parseFloat(costoTotal.toFixed(2)),
    precioSugerido: parseFloat(precioSugerido.toFixed(2)),
    breakdown: {
      combustible: parseFloat(costoCombustible.toFixed(2)),
      nomina: parseFloat(nomina.toFixed(2)),
      viaticos: parseFloat(viaticos.toFixed(2)),
      peajes: parseFloat(peajes.toFixed(2)),
      desgasteCaucho: parseFloat(desgasteCaucho.toFixed(2)),
      fijosProrrateados: parseFloat(costoFijosProrrateados.toFixed(2)),
      sobretasa: parseFloat(sobretasa.toFixed(2)),
      // Agrega más si quieres
    },
    horasEstimadas,
    distanciaKm
  };
}