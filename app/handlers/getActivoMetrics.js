// lib/estimacion/getActivoMetrics.js
const db = require('../models');

async function getActivoMetrics(activoId, mesesHistorial = 12) {
  const desde = new Date();
  desde.setMonth(desde.getMonth() - mesesHistorial);

  // 1. Datos reales del activo
  const activo = await db.Activo.findByPk(activoId, {
    include: [
      { model: db.VehiculoInstancia, include: ['plantilla'] },
      { model: db.MaquinaInstancia, include: ['plantilla'] },
    ]
  });

  if (!activo) throw new Error("Activo no encontrado");

  // 2. Histórico real
  const [fletes, kilometrajes, combustibles, gastosVar, horas] = await Promise.all([
    db.Flete.findAll({
      where: { activoPrincipalId: activoId, fechaSalida: { [db.Sequelize.Op.gte]: desde } },
      attributes: ['distanciaKm', 'id']
    }),
    db.Kilometraje.findAll({ // o Horometro según corresponda
      where: { activoId, fecha: { [db.Sequelize.Op.gte]: desde } }
    }),
    db.CargaCombustible.findAll({
      where: { activoId, fecha: { [db.Sequelize.Op.gte]: desde } }
    }),
    db.GastoVariable.findAll({
      where: { activoId: activoId, fecha: { [db.Sequelize.Op.gte]: desde } } // si tienes este campo
    }),
    db.HorasTrabajadas.findAll({
      where: { activoId: activoId, fecha: { [db.Sequelize.Op.gte]: desde } } // o vinculado por ODT/Flete
    })
  ]);

  const kmTotales = fletes.reduce((sum, f) => sum + (f.distanciaKm || 0), 0) || 
                   kilometrajes.reduce((sum, k) => sum + (k.kilometros || 0), 0);

  const litrosTotales = combustibles.reduce((sum, c) => sum + (c.litros || 0), 0);
  const costoCombustibleTotal = combustibles.reduce((sum, c) => sum + (c.montoUsd || 0), 0);

  const costoRepuestosTotal = gastosVar.reduce((sum, g) => sum + (g.monto || 0), 0);

  const horasTotales = horas.reduce((sum, h) => sum + (h.horas || 0), 0);

  // Cálculo de promedios reales
  const costoPorKmReal = kmTotales > 0 ? (costoCombustibleTotal + costoRepuestosTotal) / kmTotales : 0;
  const consumoRealLPorKm = kmTotales > 0 ? litrosTotales / kmTotales : null;
  const costoPorHoraHombreReal = horasTotales > 0 ? /* suma de nómina / horasTotales */ 0 : null; // aquí vinculas con nómina

  return {
    activo,
    kmTotales,
    costoPorKmReal: parseFloat(costoPorKmReal.toFixed(4)),
    consumoRealLPorKm: consumoRealLPorKm ? parseFloat(consumoRealLPorKm.toFixed(3)) : null,
    costoPorHoraHombreReal,
    tieneDatosSuficientes: kmTotales > 3000 && fletes.length > 5, // umbral mínimo razonable
    // Valores por defecto (ficha técnica) si no hay datos
    defaults: getDefaultSpecs(activo)
  };
}

// Tabla de valores por defecto (fichas técnicas + experiencia real 2025-2026)
function getDefaultSpecs(activo) {
  const marca = activo?.vehiculoInstancia?.plantilla?.marca?.toLowerCase() || 
                activo?.maquinaInstancia?.plantilla?.marca?.toLowerCase() || '';

  const defaults = {
    'scania': { consumoLPorKm: 0.38, costoPorKmBase: 1.45 },
    'volvo': { consumoLPorKm: 0.36, costoPorKmBase: 1.52 },
    'mercedes': { consumoLPorKm: 0.40, costoPorKmBase: 1.48 },
    'caterpillar': { consumoLPorKm: 0.45, costoPorKmBase: 2.10 }, // maquinaria
    'default': { consumoLPorKm: 0.37, costoPorKmBase: 1.50 }
  };

  const key = Object.keys(defaults).find(k => marca.includes(k)) || 'default';
  return defaults[key];
}

module.exports = getActivoMetrics;