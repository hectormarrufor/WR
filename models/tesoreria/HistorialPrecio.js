// models/HistorialPrecio.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

  const HistorialPrecio = sequelize.define('HistorialPrecio', {
    tipo: { 
      type: DataTypes.ENUM('Peaje 5 ejes', 'Peaje 6 ejes', 'Peaje 4 ejes', 'Peaje 3 ejes', 'Peaje Vehiculo Liviano', 'Gasoil', 'Gasolina'), 
      allowNull: false 
    },
    precio: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false 
    },
    moneda: { 
      type: DataTypes.STRING, 
      defaultValue: 'USD' 
    },
    fechaVigencia: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    },
    registradoPor: { type: DataTypes.INTEGER } // ID del usuario que hizo el cambio
  });

  module.exports = HistorialPrecio;
