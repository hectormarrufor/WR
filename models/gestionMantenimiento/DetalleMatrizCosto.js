const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const DetalleMatrizCosto = sequelize.define('DetalleMatrizCosto', {
  descripcion: { type: DataTypes.STRING, allowNull: false }, // Ej: Aceite Motor 15W40
  unidad: { type: DataTypes.STRING, defaultValue: 'Unidad' }, // Litros, Galón, Pieza
  cantidad: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
  
  // EL DATO CRÍTICO: ¿Cada cuánto se cambia?
  frecuenciaKm: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10000 },
  
  // EL PRECIO MERCADO (Venezuela 2026)
  costoUnitario: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },

  // CAMPO VIRTUAL: Calcula el $/Km automáticamente como el Excel
  costoPorKm: {
    type: DataTypes.VIRTUAL,
    get() {
      if (this.frecuenciaKm === 0) return 0;
      return (this.cantidad * this.costoUnitario) / this.frecuenciaKm;
    }
  }
});

DetalleMatrizCosto.associate = (models) => {
    DetalleMatrizCosto.belongsTo(models.MatrizCosto, { foreignKey: 'matrizId' });
};

module.exports = DetalleMatrizCosto;