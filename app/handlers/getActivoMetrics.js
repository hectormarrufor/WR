// lib/estimacion/getActivoCostMetrics.js
const { Op } = require('sequelize');
const db = require('../../models');

const MESES_HISTORIAL = 12;
const KM_MINIMO_REAL = 3000;      // umbral para confiar en datos reales
const FLETES_MINIMO_REAL = 8;     // mínimo fletes para considerar datos confiables

async function getActivoCostMetrics(activoId) {
  const desde = new Date();
  desde.setMonth(desde.getMonth() - MESES_HISTORIAL);

  // 1. Obtener el activo con sus instancias
  const activo = await db.Activo.findByPk(activoId, {
    include: [
      { model: db.VehiculoInstancia, include: ['plantilla'] },
      { model: db.RemolqueInstancia, include: ['plantilla'] },
      { model: db.MaquinaInstancia, include: ['plantilla'] },
    ]
  });

  if (!activo) throw new Error(`Activo ${activoId} no encontrado`);

  // 2. Recopilar datos históricos
  const [fletes, kilometrajes, cargasCombustible, gastosVariables] = await Promise.all([
    db.Flete.findAll({
      where: {
        activoPrincipalId: activoId,
        fechaSalida: { [Op.gte]: desde },
        estado: 'completado'  // solo fletes terminados
      },
      attributes: ['id', 'distanciaKm']
    }),

    db.Kilometraje.findAll({
      where: { activoId, fecha: { [Op.gte]: desde } },
      attributes: ['kilometros']
    }),

    db.CargaCombustible.findAll({
      where: { activoId, fecha: { [Op.gte]: desde } },
      attributes: ['litros', 'montoUsd']
    }),

    db.GastoVariable.findAll({
      where: {
        activoId,  // asegúrate de tener este campo en GastoVariable
        fecha: { [Op.gte]: desde }
      },
      attributes: ['monto']
    })
  ]);

  // 3. Cálculos reales
  const kmDesdeFletes = fletes.reduce((sum, f) => sum + (f.distanciaKm || 0), 0);
  const kmDesdeRegistros = kilometrajes.reduce((sum, k) => sum + (k.kilometros || 0), 0);
  const kmTotales = kmDesdeFletes + kmDesdeRegistros;

  const litrosTotales = cargasCombustible.reduce((sum, c) => sum + (c.litros || 0), 0);
  const costoCombustibleTotal = cargasCombustible.reduce((sum, c) => sum + (c.montoUsd || 0), 0);

  const costoRepuestosTotal = gastosVariables.reduce((sum, g) => sum + (g.monto || 0), 0);

  // 4. Métricas derivadas
  const consumoRealLPorKm = kmTotales > 0 ? litrosTotales / kmTotales : null;
  const costoCombustiblePorKm = kmTotales > 0 ? costoCombustibleTotal / kmTotales : null;
  const costoRepuestosPorKm = kmTotales > 0 ? costoRepuestosTotal / kmTotales : null;

  const costoVariablePorKmReal = 
    (costoCombustiblePorKm || 0) + (costoRepuestosPorKm || 0);

  const tieneDatosSuficientes = 
    kmTotales >= KM_MINIMO_REAL && fletes.length >= FLETES_MINIMO_REAL;

  // 5. Valores por defecto (fichas técnicas / promedios mundiales 2025-2026)
  const marca = (activo.vehiculoInstancia?.plantilla?.marca?.toLowerCase() ||
                 activo.maquinaInstancia?.plantilla?.marca?.toLowerCase() || '');

  const defaultsPorMarca = {
    scania:    { consumoLPorKm: 0.36, costoVariablePorKm: 1.45 },
    volvo:     { consumoLPorKm: 0.35, costoVariablePorKm: 1.50 },
    mercedes:  { consumoLPorKm: 0.38, costoVariablePorKm: 1.48 },
    caterpillar: { consumoLPorKm: 0.42, costoVariablePorKm: 2.00 }, // maquinaria
    kenworth:  { consumoLPorKm: 0.40, costoVariablePorKm: 1.55 },
    default:   { consumoLPorKm: 0.37, costoVariablePorKm: 1.50 }
  };

  const defaultKey = Object.keys(defaultsPorMarca).find(k => marca.includes(k)) || 'default';
  const defaults = defaultsPorMarca[defaultKey];

  return {
    activoId,
    kmTotales,
    fletesCompletados: fletes.length,
    consumoUsadoLPorKm: tieneDatosSuficientes ? consumoRealLPorKm : defaults.consumoLPorKm,
    costoVariablePorKmUsado: tieneDatosSuficientes ? costoVariablePorKmReal : defaults.costoVariablePorKm,
    fuente: tieneDatosSuficientes ? 'historial_real' : 'valores_estandar',
    detalleFuente: tieneDatosSuficientes 
      ? `Basado en ${kmTotales.toLocaleString()} km y ${fletes.length} fletes completados`
      : `Usando ficha técnica promedio para ${marca || 'vehículo genérico'}`,
    consumoRealLPorKm,
    costoVariablePorKmReal
  };
}

module.exports = getActivoCostMetrics;