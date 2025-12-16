const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Activo = sequelize.define('Activo', {
  codigoInterno: { // Tu identificador único de empresa (Ej: V-01, M-04)
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  tipoActivo: {
    type: DataTypes.ENUM('Vehiculo', 'Remolque', 'Maquina'),
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
  ubicacionActual: {
    type: DataTypes.STRING,
    defaultValue: 'Base Principal'
  },
  // CLAVES FORÁNEAS (Solo una estará llena)
  vehiculoInstanciaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'vehiculo_instancias', key: 'id' }
  },
  remolqueInstanciaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'remolque_instancias', key: 'id' }
  },
  maquinaInstanciaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'maquina_instancias', key: 'id' }
  }
}, {
  tableName: 'activos',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['vehiculoInstanciaId'], where: { vehiculoInstanciaId: { [DataTypes.Op.ne]: null } } },
    { unique: true, fields: ['remolqueInstanciaId'], where: { remolqueInstanciaId: { [DataTypes.Op.ne]: null } } },
    { unique: true, fields: ['maquinaInstanciaId'], where: { maquinaInstanciaId: { [DataTypes.Op.ne]: null } } }
  ]
});

Activo.associate = (models) => {
    Activo.belongsTo(models.VehiculoInstancia, { foreignKey: 'vehiculoInstanciaId', as: 'vehiculoInstancia' });
    Activo.belongsTo(models.RemolqueInstancia, { foreignKey: 'remolqueInstanciaId', as: 'remolqueInstancia' });
    Activo.belongsTo(models.MaquinaInstancia, { foreignKey: 'maquinaInstanciaId', as: 'maquinaInstancia' });
    Activo.hasMany(models.Mantenimiento, { foreignKey: 'activoId', as: 'mantenimientos' });
    Activo.hasMany(models.Inspeccion, { foreignKey: 'activoId', as: 'inspecciones' });
    Activo.hasMany(models.ConsumibleUsado, { foreignKey: 'activoId', as: 'consumiblesUsados' });
    Activo.hasMany(models.SubsistemaInstancia, { foreignKey: 'activoId', as: 'subsistemasInstancia' });
}

module.exports = Activo;