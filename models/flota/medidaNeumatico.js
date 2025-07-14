// models/MedidaNeumatico.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const MedidaNeumatico = sequelize.define('MedidaNeumatico', {
    medida: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    peso: {
      type: DataTypes.STRING,
      allowNull: false,
    },
})
module.exports = MedidaNeumatico;