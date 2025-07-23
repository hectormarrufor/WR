const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const BombaDireccion = sequelize.define('BombaDireccion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  vehiculoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true,
  },
  // --- Identificación ---
  marca: { type: DataTypes.STRING, allowNull: false },
  modelo: { type: DataTypes.STRING, allowNull: false },
  serial: { type: DataTypes.STRING, allowNull: false, unique: true },

  // --- Mantenimiento ---
  tipoFluidoRecomendado: { type: DataTypes.STRING, allowNull: false, 
},
  intervaloCambioFluidoKm: { type: DataTypes.INTEGER, allowNull: true },
  kmUltimoCambioFluido: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  
  // --- Notas ---
  notasGenerales: { type: DataTypes.TEXT, allowNull: true, 
},
}, {
  tableName: 'BombasDeDireccion',
  timestamps: true,
});

BombaDireccion.associate = (models) => {
  BombaDireccion.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
};

module.exports = BombaDireccion;