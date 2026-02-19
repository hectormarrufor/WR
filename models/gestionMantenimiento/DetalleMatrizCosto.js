// models/DetalleMatrizCosto.js
const sequelize = require('../../sequelize');
const { DataTypes } = require('sequelize');

const DetalleMatrizCosto = sequelize.define('DetalleMatrizCosto', {
  descripcion: { type: DataTypes.STRING, allowNull: false },
  unidad: { type: DataTypes.STRING, defaultValue: 'Unidad' },
  cantidad: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
  
  // 1. CÓMO SE DESGASTA ESTE COMPONENTE (Km, Horas, o Meses)
  tipoDesgaste: { 
      type: DataTypes.ENUM('km', 'horas', 'meses'), 
      allowNull: false, 
      defaultValue: 'km' 
  },
  frecuencia: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10000 },
  
  // 2. RANGOS DE PRECIOS PARA LICITACIONES
  costoMinimo: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }, // Ej: Caucho Chino $280
  costoMaximo: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }, // Ej: Caucho Michelin $600
  costoUnitario: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }, // Promedio/Estándar
});

DetalleMatrizCosto.associate = (models) => {
    DetalleMatrizCosto.belongsTo(models.MatrizCosto, { foreignKey: 'matrizId' });
};

module.exports = DetalleMatrizCosto;