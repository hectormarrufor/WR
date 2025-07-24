const { DataTypes } = require('sequelize');
const Activo = require('./Activo.js');
const sequelize = require('../../sequelize.js');

const Componente = sequelize.define('Componente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
  },
  numero_serie: {
    type: DataTypes.STRING,
    unique: true,
  },
}, {
  tableName: 'componentes',
  timestamps: true,
});

Activo.hasMany(Componente, {
  foreignKey: 'activoId',
  as: 'componentes',
});

Componente.belongsTo(Activo, {
  foreignKey: 'activoId',
  as: 'activo',
});

module.exports = Componente;