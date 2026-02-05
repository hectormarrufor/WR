// models/ResumenDiario.js
const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

  const ResumenDiario = sequelize.define('ResumenDiario', {
    fecha: {
      type: DataTypes.DATEONLY, // Formato YYYY-MM-DD
      allowNull: false,
      unique: true, // IMPORTANTE: Solo un resumen por fecha
      primaryKey: true
    },
    contenido: {
      type: DataTypes.TEXT, // El texto que generó la IA
      allowNull: false
    },
    // Opcional: Para saber cuántas observaciones había cuando se generó
    cantidadRegistros: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    hashContenido: {
        type: DataTypes.STRING,
        allowNull: true // Puede ser nulo al principio si ya tienes datos
    }
  }, {
    tableName: 'ResumenesDiarios',
    timestamps: true,
}
  
    );
  ResumenDiario.associate = function(models) {
    // asociaciones si las hay
  }
  
  module.exports = ResumenDiario;