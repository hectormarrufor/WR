const { DataTypes, Op } = require('sequelize');
const sequelize = require('../../sequelize');
// ELIMINADA LA IMPORTACIÓN CIRCULAR DE ConfiguracionGlobal AQUÍ ARRIBA

const Activo = sequelize.define('Activo', {
  codigoInterno: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  tipoActivo: {
    type: DataTypes.ENUM('Vehiculo', 'Remolque', 'Maquina', 'Equipo estacionario', 'Inmueble', 'Otro'),
    allowNull: false
  },
  imagen: {
    type: DataTypes.STRING,
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('Operativo', 'En Mantenimiento', 'Inactivo', 'Desincorporado'),
    defaultValue: 'Operativo'
  },
  fechaAdquisicion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  latitudActual: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitudActual: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  tarifaPorKm: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  tarifaPorHora: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  anio: { type: DataTypes.INTEGER, allowNull: true },
  valorAdquisicion: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  consumoCombustibleLPorKm: { type: DataTypes.FLOAT, defaultValue: 0.35 },
  consumoBaseLPorKm: { type: DataTypes.FLOAT, defaultValue: 0.25 },
  desgasteNeumaticoPorKm: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0.015 },
  capacidadTonelajeMax: { type: DataTypes.FLOAT },
  depreciacionAnualPorc: { type: DataTypes.FLOAT, defaultValue: 15 },
  costoMantenimientoTeorico: {
    type: DataTypes.FLOAT,
    defaultValue: 0.46,
  },
  costoPosesionTeorico: {
    type: DataTypes.FLOAT,
    defaultValue: 3.00,
  },
  velocidadPromedioTeorica: {
    type: DataTypes.INTEGER,
    defaultValue: 45,
  },
  valorReposicion: {
    type: DataTypes.FLOAT,
    defaultValue: 40000,
    comment: 'Valor de mercado actual del activo (para depreciación)'
  },
  vidaUtilAnios: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    comment: 'Años estimados de vida útil restante'
  },
  valorSalvamento: {
    type: DataTypes.FLOAT,
    defaultValue: 5000,
    comment: 'Valor de venta al final de su vida útil (Chatarra/Venta)'
  },
  tara: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  costoPosesionHora: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Depreciación + Interés (Calculado automáticamente)'
  },
  costoResguardoHora: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Cuota parte de vigilancia y gastos admin (Calculado desde ConfigGlobal)'
  },
  horasAnuales: {
    type: DataTypes.INTEGER,
    defaultValue: 2400, // Puedes poner 2000 o 2400 como base
    comment: 'Horas estimadas de trabajo al año exclusivas de este activo'
  },
  matrizCostoId: {
    type: DataTypes.INTEGER,
    references: { model: 'MatrizCostos', key: 'id' }
  },
}, {
  tableName: 'Activos',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['vehiculoInstanciaId'], where: { vehiculoInstanciaId: { [Op.ne]: null } } },
    { unique: true, fields: ['remolqueInstanciaId'], where: { remolqueInstanciaId: { [Op.ne]: null } } },
    { unique: true, fields: ['maquinaInstanciaId'], where: { maquinaInstanciaId: { [Op.ne]: null } } },
    { unique: true, fields: ['inmuebleInstanciaId'], where: { inmuebleInstanciaId: { [Op.ne]: null } } },
    { unique: true, fields: ['equipoInstanciaId'], where: { equipoInstanciaId: { [Op.ne]: null } } },
  ]
});

Activo.associate = (models) => {
  Activo.belongsTo(models.VehiculoInstancia, { foreignKey: 'vehiculoInstanciaId', as: 'vehiculoInstancia' });
  Activo.belongsTo(models.RemolqueInstancia, { foreignKey: 'remolqueInstanciaId', as: 'remolqueInstancia' });
  Activo.belongsTo(models.MaquinaInstancia, { foreignKey: 'maquinaInstanciaId', as: 'maquinaInstancia' });
  Activo.belongsTo(models.EquipoInstancia, { foreignKey: 'equipoInstanciaId', as: 'equipoInstancia' });
  Activo.belongsTo(models.InmuebleInstancia, { foreignKey: 'inmuebleInstanciaId', as: 'inmuebleInstancia' });
  Activo.hasMany(models.ODT, { foreignKey: 'vehiculoPrincipalId', as: 'odtsComoPrincipal' });
  Activo.hasMany(models.ODT, { foreignKey: 'vehiculoRemolqueId', as: 'odtsComoRemolque' });
  Activo.hasMany(models.ODT, { foreignKey: 'maquinariaId', as: 'odtsComoMaquinaria' });
  Activo.hasMany(models.OrdenMantenimiento, { foreignKey: 'activoId', as: 'mantenimientos' });
  Activo.hasMany(models.Inspeccion, { foreignKey: 'activoId', as: 'inspecciones' });
  Activo.hasMany(models.SubsistemaInstancia, { foreignKey: 'activoId', as: 'subsistemasInstancia' });
  Activo.hasMany(models.Kilometraje, { foreignKey: 'activoId', as: 'registrosKilometraje' });
  Activo.hasMany(models.Horometro, { foreignKey: 'activoId', as: 'registrosHorometro' });
  Activo.hasMany(models.CargaCombustible, { foreignKey: 'activoId', as: 'cargasCombustible' });
  Activo.hasMany(models.Flete, { foreignKey: 'activoPrincipalId', as: 'fletesComoVehiculo' });
  Activo.hasMany(models.Flete, { foreignKey: 'remolqueId', as: 'fletesComoRemolque' });
  Activo.belongsTo(models.Activo, { as: 'ActivoPadre', foreignKey: 'padreId' });
  Activo.hasMany(models.Activo, { as: 'ActivosHijos', foreignKey: 'padreId' });
  Activo.belongsTo(models.SubsistemaInstancia, { foreignKey: 'subsistemaInstanciaId' });
  Activo.hasMany(models.DocumentoActivo, { foreignKey: 'activoId', as: 'documentos' });
  Activo.hasMany(models.GastoVariable, { foreignKey: 'activoId', as: 'gastosVariables' });
  Activo.belongsTo(models.MatrizCosto, { foreignKey: 'matrizCostoId', as: 'matrizCosto' });
}

// ==========================================
// 🔥 HOOKS CORREGIDOS: EVITANDO REFERENCIAS CIRCULARES 🔥
// ==========================================
Activo.afterSave(async (activo, options) => {
  await actualizarTotalesFlota(options.transaction);
});

Activo.afterDestroy(async (activo, options) => {
  await actualizarTotalesFlota(options.transaction);
});

async function actualizarTotalesFlota(transaction) {
  const db = require('..'); 

  if (!db || !db.Activo || !db.ConfiguracionGlobal) {
    console.warn("No se pudo actualizar la flota, los modelos no están listos.");
    return;
  }

  // 1. Ahora también sumamos las horasAnuales
  const resultado = await db.Activo.findAll({
    attributes: [
      [db.sequelize.fn('SUM', db.sequelize.col('valorReposicion')), 'valorTotal'],
      [db.sequelize.fn('SUM', db.sequelize.col('horasAnuales')), 'horasTotales'], // <-- NUEVO
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalUnidades']
    ],
    raw: true,
    transaction
  });

  const valorFlota = resultado[0].valorTotal || 0;
  const horasTotales = resultado[0].horasTotales || 0; // <-- NUEVO
  const conteoUnidades = resultado[0].totalUnidades || 0;

  // 2. Actualizamos la configuración global mandando las horas
  await db.ConfiguracionGlobal.update(
    {
      valorFlotaTotal: parseFloat(valorFlota),
      cantidadTotalUnidades: parseInt(conteoUnidades),
      horasTotalesFlota: parseInt(horasTotales) // <-- SE GUARDA AQUÍ
    },
    { where: { id: 1 }, transaction }
  );
}

module.exports = Activo;