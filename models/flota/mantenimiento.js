const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Mantenimiento = sequelize.define('Mantenimiento', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tipoMantenimiento: { // Ej: 'Preventivo', 'Correctivo', 'Orden de Trabajo'
      type: DataTypes.ENUM('Preventivo', 'Correctivo', 'Orden de Trabajo'),
      allowNull: false,
    },
    fechaCreacionOrden: { // Fecha en que se generó la orden
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    fechaRealizacion: { // Fecha en que se completó el mantenimiento
      type: DataTypes.DATE,
      allowNull: true,
    },
    kilometrajeMantenimiento: {
      type: DataTypes.INTEGER,
      allowNull: true, // Puede que la orden se cree antes de saber el kilometraje exacto de ejecución
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    costoTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    estadoOrden: { // Ej: 'Abierta', 'En Progreso', 'Completada', 'Cancelada'
      type: DataTypes.ENUM('Abierta', 'En Progreso', 'Completada', 'Cancelada'),
      defaultValue: 'Abierta',
      allowNull: false,
    },
    vehiculoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Vehiculos',
        key: 'id',
      },
      allowNull: false,
    },
    proximoKilometrajeMantenimiento: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    proximaFechaMantenimiento: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  Mantenimiento.associate = (models) => {
    Mantenimiento.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
    Mantenimiento.hasMany(models.TareaMantenimiento, { foreignKey: 'mantenimientoId', as: 'tareasMantenimiento' });
  };

  module.exports = Mantenimiento;