const { DataTypes } = require('sequelize');
const OrdenTrabajo = require('./OrdenTrabajo.js');
const Repuesto = require('./Repuesto.js');
const sequelize = require('../../sequelize.js');

const OrdenTrabajoRepuesto = sequelize.define('OrdenTrabajoRepuesto', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cantidad_usada: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'orden_trabajo_repuestos',
  timestamps: false,
});

OrdenTrabajo.belongsToMany(Repuesto, {
  through: OrdenTrabajoRepuesto,
  foreignKey: 'ordenTrabajoId',
  as: 'repuestos_usados'
});
Repuesto.belongsToMany(OrdenTrabajo, {
  through: OrdenTrabajoRepuesto,
  foreignKey: 'repuestoId',
  as: 'ordenes_de_trabajo'
});

module.exports = OrdenTrabajoRepuesto;