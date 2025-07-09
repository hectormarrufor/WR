const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Vehiculo = sequelize.define(
  'Vehiculo',
  {
    marca: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modelo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    imagen: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    placa: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ano: {
      type: DataTypes.INTEGER,
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
    tipoPeso: {
      type: DataTypes.ENUM('liviana', 'pesada'),
      allowNull: false,
    },
    ejes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    neumatico: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    correa: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    kilometraje: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    horometro: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM('OK', 'Próximo a mantenimiento', 'Mantenimiento urgente'),
      allowNull: false,
      defaultValue: 'OK',
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
    carroceria: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  },
  {
    tableName: 'Vehiculos',
    timestamps: true,
  }
);

module.exports = Vehiculo;