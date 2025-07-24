const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const ManoDeObraOrdenTrabajo = sequelize.define('ManoDeObraOrdenTrabajo', {
  horas_trabajadas: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
}, {
  tableName: 'ManoDeObraOrdenTrabajo',
  timestamps: false,
});

module.exports = ManoDeObraOrdenTrabajo;