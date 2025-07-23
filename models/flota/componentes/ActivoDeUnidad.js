const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const ActivoDeUnidad = sequelize.define('ActivoDeUnidad', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  unidadOperativaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'UnidadesOperativas',
      key: 'id'
    }
  },
  // --- Campos para la Asociación Polimórfica ---
  activoId: { // El ID del Vehículo o del ComponenteMayor
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  activoTipo: { // El nombre del modelo: 'vehiculo' o 'componenteMayor'
    type: DataTypes.STRING,
    allowNull: false,
  },
  // ---------------------------------------------
  rolEnUnidad: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Ej: "Unidad Tractora", "Unidad de Potencia", "Carrete Principal".'
  }
}, {
  tableName: 'ActivosDeUnidades',
  timestamps: true,
  indexes: [ // Optimiza las búsquedas
    { fields: ['activoId', 'activoTipo'] }
  ]
});

ActivoDeUnidad.associate = (models) => {
  ActivoDeUnidad.belongsTo(models.UnidadOperativa, { foreignKey: 'unidadOperativaId', as: 'unidad' });
  // Las asociaciones inversas se definen en los otros modelos (Vehiculo, ComponenteMayor)
};

module.exports = ActivoDeUnidad;