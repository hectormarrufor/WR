// Tabla intermedia para equivalencias de filtros
const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');
const Consumible = require('../Consumible');
const Filtro = require('./Filtro');

const EquivalenciaFiltro = sequelize.define('EquivalenciaFiltro', {});

// Relación N:M entre Filtro y Filtro
Filtro.belongsToMany(Filtro, { 
  through: EquivalenciaFiltro, 
  as: 'equivalentes', 
  foreignKey: 'filtroId', 
  otherKey: 'equivalenteId' 
});
module.exports = EquivalenciaFiltro;