const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const PTO = sequelize.define('PTO', {
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
  
  // --- Especificaciones y Mantenimiento ---
  tipoFluidoHidraulico: { type: DataTypes.STRING, allowNull: false, 
},
  capacidadFluidoLitros: { type: DataTypes.FLOAT, allowNull: false },
  presionOperacionPSI: { type: DataTypes.INTEGER, 
},
  intervaloCambioFluidoHoras: { type: DataTypes.INTEGER, allowNull: true },
  horasUltimoCambioFluido: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },

  // --- Notas ---
  notasGenerales: { type: DataTypes.TEXT, allowNull: true, 
},
}, {
  tableName: 'PTOs', // Power Take-Offs
  timestamps: true,
});

PTO.associate = (models) => {
  PTO.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
};

module.exports = PTO;