const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const UnidadOperativa = sequelize.define('UnidadOperativa', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  tipoUnidad: {
    type: DataTypes.ENUM('Coiled Tubing', 'Snubbing', 'Cementación', 'Wireline', 'Gabarra'),
    allowNull: false,
  },
  estado: {
    type: DataTypes.ENUM('Operativa', 'En Mantenimiento', 'En Movilización', 'Inactiva'),
    defaultValue: 'Inactiva',
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'UnidadesOperativas',
  timestamps: true,
});

UnidadOperativa.associate = (models) => {
  // Una Unidad Operativa TIENE MUCHOS Activos (a través de la tabla de unión)
  UnidadOperativa.hasMany(models.ActivoDeUnidad, {
    foreignKey: 'unidadOperativaId',
    as: 'activos'
  });
  UnidadOperativa.hasMany(models.Mudanza, {
    foreignKey: 'unidadOperativaId',
    as: 'historialMudanzas'
  });
  UnidadOperativa.hasMany(models.Inspeccion, {
  foreignKey: 'inspeccionableId', constraints: false, scope: { inspeccionableTipo: 'unidadOperativa' }, as: 'historialInspecciones'
});
};

module.exports = UnidadOperativa;