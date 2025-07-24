const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const PartesOrdenTrabajo = sequelize.define('PartesOrdenTrabajo', {
  cantidad_usada: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'PartesOrdenTrabajo',
  timestamps: false,
});

module.exports = PartesOrdenTrabajo;