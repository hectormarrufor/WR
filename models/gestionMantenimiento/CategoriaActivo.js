const { DataTypes } = require('sequelize');
const sequelize =require('../../sequelize');

const CategoriaActivo = sequelize.define('CategoriaActivo', {
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
  descripcion: {
    type: DataTypes.TEXT,
  },
  // CAMBIO CLAVE: Campo para agrupar las categorías
  grupo: {
    type: DataTypes.ENUM(
      'VEHICULO',       // Para camionetas, carros, etc.
      'GABARRA',        // Para activos offshore
      'UNIDAD_OPERATIVA', // Para Coiled Tubing, Wireline, Taladros
      'COMPONENTE_MAYOR', // Para Chutos, Lowboys, Skids
      'COMPONENTE_MENOR'  // Para Motores, Transmisiones, Bombas
    ),
    allowNull: false,
  },
}, {
  tableName: 'categorias_activos',
  timestamps: true,
});

module.exports = CategoriaActivo;