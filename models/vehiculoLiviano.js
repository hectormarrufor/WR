const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const VehiculoLiviano = sequelize.define('VehiculoLiviano', {
  marca: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  modelo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ano: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  peso: {
    type: DataTypes.ENUM('liviano', 'mediano', 'pesado'),
    allowNull: false,
  },
  Modelo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  priceSlab: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  priceSqft: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  imgURL: {
    type: DataTypes.STRING,
    allowNull: false
  },
  width: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  height: {
    type: DataTypes.FLOAT,
    allowNull: true
  }


})

module.exports = VehiculoLiviano;