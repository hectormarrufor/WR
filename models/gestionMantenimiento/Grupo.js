const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize.js');

const Grupo = sequelize.define('Grupo', {
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
  // La plantilla del formulario para este grupo:
  definicion_formulario: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'grupos',
  timestamps: true,
});

module.exports = Grupo;