// lib/estimacion/calcularCostoFlete.js
const { Op } = require('sequelize');
const db = require('../../models');

// Umbrales para confiar en datos históricos
const KM_MINIMO_REAL = 3000;
const FLETES_MINIMO_REAL = 8;
const MESES_HISTORIAL = 12;

async function calcularCostoFlete({
  activoPrincipalId,          // Obligatorio
  distanciaKm,                // Desde Google Maps (ida + vuelta)
  tonelaje = 0,               // Toneladas reales
  tipoCarga = 'general',      // 'general', 'petrolera', 'peligrosa'
  choferId,                   // Para estimar nómina
  ayudanteId = null,          // Opcional
  cantidadPeajes = 0,
  precioPeajeUnitario = 5,    // Desde config
  precioGasoilUsd = 0.8,      // Desde config o BCV
  porcentajeGanancia = 0.30,  // 30% margen típico
  horasEstimadas = null,      // Si no se pasa, se calcula
}) {
  // 1. Obtener métricas reales del activo
  const desde = new Date();
  desde.setMonth(desde.getMonth() - MESES_HISTORIAL);

  const activo = await db.Activo.findByPk(activoPrincipalId, {
    include: [
      { model: db.VehiculoInstancia, as: "vehiculoInstancia", include: [{model: db.Vehiculo, as: "plantilla"}] },
      { model: db.RemolqueInstancia, as: "remolqueInstancia", include: [{model: db.Remolque, as: "plantilla"}] },
      { model: db.MaquinaInstancia, as: "maquinaInstancia", include: [{model: db.Maquina, as: "plantilla"}] },
    ]
  });

  if (!activo) throw new Error(`Activo ${activoPrincipalId} no encontrado`);

  const [fletes, kilometrajes, cargasCombustible, gastosVariables] = await Promise.all([
    db.Flete.findAll({
      where: {
        activoPrincipalId,
        fechaSalida: { [Op.gte]: desde },
        estado: 'completado'
      },
      attributes: ['distanciaKm']
    }),
    db.Kilometraje.findAll({
      where: { activoId: activoPrincipalId, fecha_registro: { [Op.gte]: desde } }
    }),
    db.CargaCombustible.findAll({
      where: { activoId: activoPrincipalId, fecha: { [Op.gte]: desde } }
    }),
    db.GastoVariable.findAll({
      where: { activoId: activoPrincipalId, fechaGasto: { [Op.gte]: desde } }
    })
  ]);

  const kmTotales = fletes.reduce((sum, f) => sum + (f.distanciaKm || 0), 0) +
                    kilometrajes.reduce((sum, k) => sum + (k.kilometros || 0), 0);

  const litrosTotales = cargasCombustible.reduce((sum, c) => sum + (c.litros || 0), 0);
  const costoCombustibleTotal = cargasCombustible.reduce((sum, c) => sum + (c.montoUsd || 0), 0);
  const costoRepuestosTotal = gastosVariables.reduce((sum, g) => sum + (g.monto || 0), 0);

  const tieneDatosSuficientes = kmTotales >= KM_MINIMO_REAL && fletes.length >= FLETES_MINIMO_REAL;

  // 2. Valores a usar (reales o estándar)
  let consumoLPorKm;
  let costoVariablePorKm;

  if (tieneDatosSuficientes) {
    consumoLPorKm = kmTotales > 0 ? litrosTotales / kmTotales : 0.37;
    costoVariablePorKm = kmTotales > 0 
      ? (costoCombustibleTotal + costoRepuestosTotal) / kmTotales 
      : 1.50;
  } else {
    // Valores estándar por marca (promedios mundiales 2025-2026)
    const marca = (activo.vehiculoInstancia?.plantilla?.marca?.toLowerCase() ||
                   activo.maquinaInstancia?.plantilla?.marca?.toLowerCase() || '');

    const defaults = {
      scania:    { consumo: 0.36, costoKm: 1.45 },
      volvo:     { consumo: 0.35, costoKm: 1.50 },
      mercedes:  { consumo: 0.38, costoKm: 1.48 },
      caterpillar: { consumo: 0.42, costoKm: 2.00 },
      kenworth:  { consumo: 0.40, costoKm: 1.55 },
      default:   { consumo: 0.37, costoKm: 1.50 }
    };

    const key = Object.keys(defaults).find(k => marca.includes(k)) || 'default';
    consumoLPorKm = defaults[key].consumo;
    costoVariablePorKm = defaults[key].costoKm;
  }

  // 3. Cálculos principales
  const factorCarga = 1 + (tonelaje / (activo.capacidadTonelajeMax || 30)) * 0.15; // +15% máx ajuste
  const combustibleLitros = distanciaKm * consumoLPorKm * factorCarga;
  const costoCombustible = combustibleLitros * precioGasoilUsd;

  // Nómina (estimada)
  let horas = horasEstimadas;
  if (!horas) {
    horas = (distanciaKm / 50) + 4; // 50 km/h promedio + 4h operativas
  }

  // Rates aproximados (mejorar con datos reales de Empleado cuando tengas)
  const choferRate = 15; // $/hora
  const ayudanteRate = ayudanteId ? 10 : 0;
  const costoNomina = horas * (choferRate + ayudanteRate);

  // Viáticos
  const diasViaje = Math.ceil(horas / 10) + 1;
  const viaticos = diasViaje * 25; // $25/día estándar

  const peajes = cantidadPeajes * precioPeajeUnitario;
  const desgasteCaucho = distanciaKm * 0.015; // $0.015/km estándar

  // Costos fijos prorrateados (aproximado; mejorar con CostParameters real)
  const cfPorViaje = 5000 / 20; // $250/viaje (ejemplo: admin + depreciación / 20 viajes mes)

  let costoTotal = 
    costoCombustible +
    costoNomina +
    viaticos +
    peajes +
    desgasteCaucho +
    (distanciaKm * costoVariablePorKm) +
    cfPorViaje;

  // Sobretasa PDVSA (valores aproximados gaceta antigua; actualiza si hay nueva)
  let sobretasa = 0;
  if (tipoCarga.includes('petrolera') || tipoCarga === 'hidrocarburos') {
    sobretasa = distanciaKm < 750 ? 1.9951 * distanciaKm : 1.4396 * distanciaKm;
  }
  costoTotal += sobretasa;

  const precioSugerido = costoTotal * (1 + porcentajeGanancia);

  // Breakdown detallado
  const breakdown = {
    combustible: parseFloat(costoCombustible.toFixed(2)),
    nomina: parseFloat(costoNomina.toFixed(2)),
    viaticos: parseFloat(viaticos.toFixed(2)),
    peajes: parseFloat(peajes.toFixed(2)),
    desgasteCaucho: parseFloat(desgasteCaucho.toFixed(2)),
    variablesActivo: parseFloat((distanciaKm * costoVariablePorKm).toFixed(2)),
    fijosProrrateados: parseFloat(cfPorViaje.toFixed(2)),
    sobretasa: parseFloat(sobretasa.toFixed(2)),
    total: parseFloat(costoTotal.toFixed(2)),
    precioSugerido: parseFloat(precioSugerido.toFixed(2))
  };

  return {
    costoTotal: breakdown.total,
    precioSugerido: breakdown.precioSugerido,
    breakdown,
    metrics: {
      fuente: tieneDatosSuficientes ? 'historial_real' : 'valores_estandar',
      detalle: tieneDatosSuficientes
        ? `Basado en ${kmTotales.toLocaleString()} km reales y ${fletes.length} fletes`
        : `Valores estándar ficha técnica (${consumoLPorKm} L/km, $${costoVariablePorKm.toFixed(2)}/km)`,
      kmAnalizados: kmTotales,
      consumoUsadoLPorKm: parseFloat(consumoLPorKm.toFixed(3)),
      costoVariablePorKmUsado: parseFloat(costoVariablePorKm.toFixed(4))
    }
  };
}

module.exports = calcularCostoFlete;