const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize'); // Ajusta tu ruta de importación

const Inspeccion = sequelize.define('Inspeccion', {
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  // Trazabilidad exacta del momento del reporte
  kilometrajeRegistrado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true // Puede ser null si es una máquina estacionaria
  },
  horometroRegistrado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true // Puede ser null si es un vehículo sin horómetro
  },
  observacionGeneral: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Tipo de reporte para filtrar estadísticas
  origen: {
    type: DataTypes.ENUM('Pre-Uso', 'Post-Uso', 'Rutina', 'Incidente'),
    defaultValue: 'Rutina'
  }
}, {
  tableName: 'Inspecciones'
});

Inspeccion.associate = (models) => {
  Inspeccion.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo' });
  Inspeccion.belongsTo(models.User, { foreignKey: 'usuarioId', as: 'reportadoPor' }); // El chofer/operador
  Inspeccion.hasMany(models.Hallazgo, { foreignKey: 'inspeccionId', as: 'hallazgos' });
};

module.exports = Inspeccion;