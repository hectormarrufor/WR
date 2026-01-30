const { DataTypes, Op } = require('sequelize');
const sequelize = require('../../sequelize');

const Activo = sequelize.define('Activo', {
  codigoInterno: { // Tu identificador único de empresa (Ej: V-01, M-04)
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
  tarifaPorKm: {  // Costo por kilómetro para vehículos y remolques
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  tarifaPorHora: {  // Costo por hora para maquinaria y equipos
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
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
  Activo.belongsTo(models.SubsistemaInstancia, { foreignKey: 'subsistemaInstanciaId' }); // "Oficina Presidencia"
  Activo.hasMany(models.DocumentoActivo, { foreignKey: 'activoId', as: 'documentos' });
}

module.exports = Activo;