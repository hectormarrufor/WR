const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const JerarquiaActivos = sequelize.define('JerarquiaActivos', {
  id_activo_padre: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'Activos',
      key: 'id_activo',
    },
  },
  id_activo_hijo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'Activos',
      key: 'id_activo',
    },
  },
}, {
  tableName: 'JerarquiaActivos',
  timestamps: false,
});

// Este modelo no necesita una función 'associate' porque es una tabla 'through'
// y las asociaciones se definen en el modelo 'Activo'.

module.exports = JerarquiaActivos;