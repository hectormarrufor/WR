// models/ConfiguracionGeneral.js
const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ConfiguracionGeneral = sequelize.define('ConfiguracionGeneral', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  clave: { // Ej. 'HORARIO_OFICINA_INICIO', 'HORARIO_OFICINA_FIN'
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Cada clave debe ser única
  },
  valor: { // El valor asociado a la clave
    type: DataTypes.STRING, // Puedes almacenar el tiempo como string "HH:MM"
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'ConfiguracionesGenerales',
  timestamps: true,
});

module.exports = ConfiguracionGeneral;