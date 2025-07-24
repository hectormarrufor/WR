const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  rol: {
    type: DataTypes.ENUM('tecnico', 'planificador', 'supervisor', 'admin'),
    allowNull: false,
  },
  especialidad: {
    type: DataTypes.STRING, // Ej. 'Hidráulica', 'Mecánica Diesel', 'Electricidad'
    allowNull: true,
  },
}, {
  tableName: 'usuarios',
  timestamps: true,
});

module.exports = Usuario;