// models/TipoVehiculo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const bcrypt = require('bcryptjs');

const TipoVehiculo = sequelize.define('TipoVehiculo', {
    label: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    peso: {
      type: DataTypes.STRING,
      allowNull: false,
    },
})
module.exports = TipoVehiculo;
