const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const ListaOpciones = sequelize.define('ListaOpciones', {
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
  opciones: {
    type: DataTypes.JSONB, // Un arreglo de strings con las opciones
    allowNull: false,
  },
}, {
  tableName: 'listas_opciones',
  timestamps: true,
});

module.exports = ListaOpciones;