const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const TareaMantenimiento = sequelize.define('TareaMantenimiento', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    descripcion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: { // Ej: 'Pendiente', 'En Progreso', 'Completada', 'Cancelada', 'Rechazada'
      type: DataTypes.ENUM('Pendiente', 'En Progreso', 'Completada', 'Cancelada', 'Rechazada'),
      defaultValue: 'Pendiente',
      allowNull: false,
    },
    fechaInicio: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fechaFin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    costoTarea: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    // Vinculación con la Orden de Mantenimiento (Mantenimiento)
    mantenimientoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Mantenimientos',
        key: 'id',
      },
      allowNull: true, // Una tarea puede existir como "pendiente" sin estar en una orden aún
    },
    // Vinculación con el Hallazgo de Inspección que originó esta tarea
    hallazgoInspeccionId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'HallazgoInspecciones',
        key: 'id',
      },
      unique: true, // Un hallazgo debería generar una única tarea (o al menos una principal)
      allowNull: true, // No todas las tareas provienen de una inspección (ej: tarea manual)
    },
    vehiculoId: { // Sigue siendo importante para filtrar tareas pendientes por vehículo
      type: DataTypes.INTEGER,
      references: {
        model: 'Vehiculos',
        key: 'id',
      },
      allowNull: false,
    },
  });

  TareaMantenimiento.associate = (models) => {
    TareaMantenimiento.belongsTo(models.Mantenimiento, { foreignKey: 'mantenimientoId', as: 'mantenimiento' });
    TareaMantenimiento.belongsTo(models.HallazgoInspeccion, { foreignKey: 'hallazgoInspeccionId', as: 'hallazgoOrigen' });
    TareaMantenimiento.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
    TareaMantenimiento.hasMany(models.ParteUsada, { foreignKey: 'tareaMantenimientoId', as: 'partesUsadas' });
    TareaMantenimiento.hasMany(models.ConsumibleUsado, { foreignKey: 'tareaMantenimientoId', as: 'consumiblesUsados' });
  };

  module.exports = TareaMantenimiento;