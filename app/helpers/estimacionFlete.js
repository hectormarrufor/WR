// lib/estimacionFlete.js
const db = require('../models'); // tu index.js
const { getDistance } = require('google-distance-matrix'); // o usa tu @react-google-maps/api en frontend, pero para server: axios a Google

export async function calcularFlete(fleteData) { // {activoPrincipalId, destinoCoords, tonelaje, tipoCarga, choferId, ayudanteId?, fechaSalida}
  const activo = await db.Activo.findByPk(fleteData.activoPrincipalId);
  const params = await db.CostParameters.findOne({ order: [['createdAt', 'DESC']] }); // latest
  const bcv = await db.BcvPrecioHistorico.findOne({ order: [['fecha', 'DESC']] }); // tasa actual

  // 1. Distancia (Google API - configura tu key en .env)
  const origen = '10.123,-71.456'; // coords Tía Juana (o desde activo.lat/long)
  const distanciaKm = await getGoogleDistance(origen, fleteData.destinoCoords); // implementa abajo

  // 2. Horas estimadas (velocidad avg 50km/h + 2h carga/descarga)
  const horas = (distanciaKm / 50) + 2;

  // 3. Costos
  let costoActivo = activo.tipoActivo.includes('Vehiculo') 
    ? activo.tarifaPorKm * distanciaKm 
    : activo.tarifaPorHora * horas;

  const combustible = (activo.consumoCombustibleLPorKm || 0.35) * distanciaKm * (params.fuelPrice || 0.8); // USD/L diesel
  const nomina = (params.operatorRate || 15) * horas * 1.2; // chofer + ayudante (ajusta por IDs)
  const fijosProrrateados = ((params.mantenimientoMensual + params.administrativosMensual) / 160) * horas;
  const peajes = fleteData.cantidadPeajes * 5; // estimado o manual
  const viaticos = horas * 10; // viáticos chofer

  let totalCV = combustible + nomina + peajes + viaticos;
  let totalCF = fijosProrrateados + costoActivo;

  let costoTotal = totalCF + totalCV;

  // Sobretasa PDVSA (si tipoCarga oil o cliente PDVSA)
  let sobretasa = 0;
  if (fleteData.tipoCarga === 'PDVSA' || fleteData.tipoCarga.includes('oil')) {
    sobretasa = distanciaKm < 750 ? 1.9951 * distanciaKm : 1.4396 * distanciaKm; // de Gaceta 2023 - actualiza
  }

  const precioSugerido = (costoTotal * 1.25) + sobretasa; // 25% margen

  // Guardar
  const estimate = await db.CostEstimate.create({
    fleteId: fleteData.id, // si ya creado
    totalCost: costoTotal,
    breakdown: { combustible, nomina, fijos: totalCF, sobretasa, precioSugerido },
    // ...
  });

  return { costoEstimado: costoTotal, precioSugerido, distanciaKm, horas, breakdown: estimate.breakdown };
}

// Helper Google (server-side con axios)
async function getGoogleDistance(origen, destino) {
  const response = await axios.get(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origen}&destinations=${destino}&key=${process.env.GOOGLE_API_KEY}`);
  return response.data.rows[0].elements[0].distance.value / 1000; // km
}