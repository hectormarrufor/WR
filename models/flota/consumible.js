const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Consumible = sequelize.define('Consumible', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: { // Ej: "Aceite de motor 5W-30", "Refrigerante G12"
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    tipo: { // Ej: 'Aceite', 'Refrigerante', 'Líquido de Frenos', etc.
      type: DataTypes.ENUM('Aceite', 'Refrigerante', 'Líquido de Frenos', 'Líquido de Dirección', 'Otros'),
      allowNull: true,
    },
    unidadMedida: { // Ej: 'Litros', 'Galones', 'ml'
      type: DataTypes.STRING,
      allowNull: true,
    },
    costoUnitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  });

  module.exports = Consumible;