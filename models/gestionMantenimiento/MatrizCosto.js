const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const MatrizCosto = sequelize.define('MatrizCosto', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false, // Ej: "Estructura de Costos Chuto Mack 2026"
  },
  tipoActivo: {
    type: DataTypes.ENUM('Vehiculo', 'Remolque', 'Maquina'),
    allowNull: false
  },
  // Total calculado (se actualiza al guardar los detalles)
  totalCostoKm: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  }
});

MatrizCosto.associate = (models) => {
    MatrizCosto.hasMany(models.DetalleMatrizCosto, { 
        foreignKey: 'matrizId', 
        as: 'detalles',
        onDelete: 'CASCADE' 
    });
};

module.exports = MatrizCosto;