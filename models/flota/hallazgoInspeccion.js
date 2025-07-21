// models/flota/hallazgoInspeccion.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize'); // Asegúrate que la ruta a tu instancia de sequelize es correcta

const HallazgoInspeccion = sequelize.define('HallazgoInspeccion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  vehiculoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Vehiculos', // Nombre de la tabla de vehículos
      key: 'id',
    },
  },
  inspeccionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Inspecciones', // Nombre de la tabla de inspecciones
      key: 'id',
    },
  },
  nombreSistema: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  gravedad: {
    type: DataTypes.ENUM('Baja', 'Media', 'Crítica'),
    allowNull: false,
  },
  estaResuelto: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  fechaResolucion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'Asignado', 'Resuelto', 'Descartado'),
    defaultValue: 'Pendiente',
    allowNull: false,
  },
}, {
  tableName: 'HallazgosInspeccion',
  timestamps: true,
});

HallazgoInspeccion.associate = (models) => {
  HallazgoInspeccion.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
  // ¡Esta es la asociación que falta o es incorrecta!
  HallazgoInspeccion.belongsTo(models.Inspeccion, { foreignKey: 'inspeccionId', as: 'inspeccion' }); // <-- ¡Añadir o corregir esta línea!
};

module.exports = HallazgoInspeccion;