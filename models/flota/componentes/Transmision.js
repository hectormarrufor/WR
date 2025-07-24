const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const Transmision = sequelize.define('Transmision', {
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
  tipo: { type: DataTypes.ENUM('Automática', 'Manual', 'Automatizada'), allowNull: false },

  // --- Fluidos y Mantenimiento ---
  capacidadAceiteLitros: { type: DataTypes.FLOAT, allowNull: false },
  tipoAceiteRecomendado: { type: DataTypes.STRING, allowNull: false, 
},
  intervaloCambioAceiteKm: { type: DataTypes.INTEGER, allowNull: true },
  intervaloCambioAceiteHoras: { type: DataTypes.INTEGER, allowNull: true },
  kmUltimoCambioAceite: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  horasUltimoCambioAceite: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  
  // --- Notas ---
  notasGenerales: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'Transmisiones',
  timestamps: true,
});

Transmision.associate = (models) => {
  Transmision.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
};

module.exports = Transmision;