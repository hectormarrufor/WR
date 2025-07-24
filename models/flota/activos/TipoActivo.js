const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const TipoActivo = sequelize.define('TipoActivo', {
  id_tipo_activo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre_tipo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  es_activo_base: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Verdadero si puede alojar activos modulares.',
  },
  es_activo_modular: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Verdadero si puede ser montado en un activo base.',
  },
}, {
  tableName: 'TiposActivo',
  timestamps: false,
});

TipoActivo.associate = (models) => {
  TipoActivo.hasMany(models.Activo, { foreignKey: 'id_tipo_activo' });
};

module.exports = TipoActivo;