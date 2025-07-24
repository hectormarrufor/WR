const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const CompresorAire = sequelize.define('CompresorAire', {
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
  capacidadCFM: { type: DataTypes.INTEGER, 
},
  tipoAceiteRecomendado: { type: DataTypes.STRING, allowNull: true,
    },
  intervaloServicioHoras: { type: DataTypes.INTEGER, allowNull: true, 
},
  horasUltimoServicio: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },

  // --- Sistema Neumático ---
  capacidadPulmonGalones: { type: DataTypes.FLOAT, 
},
  
  // --- Notas ---
  notasGenerales: { type: DataTypes.TEXT, allowNull: true, 
},
}, {
  tableName: 'Compresores',
  timestamps: true,
});

CompresorAire.associate = (models) => {
  CompresorAire.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
};

module.exports = CompresorAire;