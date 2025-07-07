const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Vehiculo = sequelize.define('Vehiculo', {
  marca: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  modelo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  placa: {
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
    type: DataTypes.ENUM('liviana', 'pesada'),
    allowNull: false,
  },
  ejes: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  neumatico: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  kilometraje: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  horometro: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  correa: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  combustible: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  transmision: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  motor: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  
  
  

})

module.exports = Vehiculo;