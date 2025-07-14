const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Parte = sequelize.define('Parte', {
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
    numeroParte: { // Ej: OEM o SKU
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    costoUnitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  });

  module.exports = Parte;