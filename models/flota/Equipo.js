// models/flota/equipo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize'); // Asegúrate que la ruta a tu instancia de sequelize es correcta

const Equipo = sequelize.define('Equipo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  numeroSerie: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true, // El número de serie debe ser único
  },
  fabricante: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  modelo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fechaAdquisicion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  costoAdquisicion: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  // Campo para el horómetro actual del equipo
  horometroActual: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  // Tipo de equipo (ej: 'Bomba', 'Generador', 'Compresor', 'Motor Auxiliar', etc.)
  tipoEquipo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Estado operativo del equipo
  estadoOperativo: {
    type: DataTypes.ENUM('Operativo', 'No Operativo', 'En Mantenimiento', 'Inactivo'),
    defaultValue: 'Operativo',
    allowNull: false,
  },
  // Propiedades adicionales específicas del tipo de equipo (JSONB)
  especificaciones: {
    type: DataTypes.JSONB,
    defaultValue: {},
    allowNull: true,
  },
  // Ubicación del equipo: puede estar en un vehículo, en una gabarra o en un almacén/base.
  // Podrías usar IDs de FK para vincularlo a Vehiculo o Gabarra.
  // Por simplicidad inicial, podemos tener un campo de texto y luego refinarlo.
  ubicacionDetalle: {
    type: DataTypes.TEXT, // Ej: 'En Gabarra "X"', 'Montado en CTU-001', 'Almacén Principal'
    allowNull: true,
  },
  // Claves foráneas para vincular directamente a Vehiculo o Gabarra si lo deseas:
  vehiculoId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Puede ser nulo si está en almacén o gabarra
    references: {
      model: 'Vehiculos', // Asume que 'Vehiculos' es tu tabla de vehículos
      key: 'id',
    },
  },
  gabarraId: { // <-- Si creamos un modelo de Gabarra, se vincularía aquí
    type: DataTypes.INTEGER,
    allowNull: true, // Puede ser nulo si está en vehículo o almacén
    // references: {
    //   model: 'Gabarras', // Tendríamos que crear este modelo
    //   key: 'id',
    // },
  },
}, {
  tableName: 'Equipos', // Nombre de la tabla para los equipos
  timestamps: true,
});

Equipo.associate = (models) => {
  Equipo.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
  // Si creas el modelo Gabarra, añadirías:
  // Equipo.belongsTo(models.Gabarra, { foreignKey: 'gabarraId', as: 'gabarra' });
  // Equipo.hasMany(models.HorometroEquipo, { foreignKey: 'equipoId', as: 'horometros' }); // Si llevas historial de horometro para equipos
};

module.exports = Equipo;