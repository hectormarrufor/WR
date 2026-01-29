const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InspeccionNeumatico = sequelize.define('InspeccionNeumatico', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  neumaticoId: { type: DataTypes.UUID, allowNull: false },
  profundidad_32nds: { type: DataTypes.INTEGER, allowNull: false }, // Guardamos el entero (ej. 3, 5, 8)
  fechaInspeccion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  observaciones: { type: DataTypes.TEXT }
}, {
  tableName: 'inspecciones_neumaticos',
  timestamps: true
});

module.exports = InspeccionNeumatico;