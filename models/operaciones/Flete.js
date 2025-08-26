// models/Flete.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');


  const Flete = sequelize.define("Flete", {
    referencia: DataTypes.STRING,
    fecha: DataTypes.DATE,
    origen: DataTypes.STRING,
    destino: DataTypes.STRING,
    tipoUnidad: DataTypes.STRING, // chuto, lowboy, vacuum, etc.
    kmRecorridos: DataTypes.FLOAT,
    horasOperativas: DataTypes.FLOAT,
    cliente: DataTypes.STRING,
    observaciones: DataTypes.TEXT
  });

    module.exports = Flete;