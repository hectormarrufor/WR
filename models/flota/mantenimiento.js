// models/flota/mantenimiento.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize.js'); // Asegúrate que la ruta es correcta

const Mantenimiento = sequelize.define(
  'Mantenimiento',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    vehiculoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Vehiculos',
        key: 'id',
      },
    },
    // Eliminamos el campo 'tipo' de aquí. Ahora el tipo será una consolidación de las tareas.
    // tipo: {
    //   type: DataTypes.ENUM('Preventivo', 'Correctivo', 'Predictivo'),
    //   allowNull: false,
    // },
    estado: {
      type: DataTypes.ENUM('Pendiente', 'En Progreso', 'Completado', 'Cancelada'),
      defaultValue: 'Pendiente',
    },
    fechaInicio: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    fechaCompletado: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    descripcionGeneral: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    responsableId: { // Puedes vincularlo a un Empleado si tienes un modelo de empleados
      type: DataTypes.INTEGER,
      allowNull: true,
      // references: {
      //   model: 'Empleados',
      //   key: 'id',
      // },
    },
    kilometrajeMantenimiento: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    horometroMantenimiento: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: 'Mantenimientos',
    timestamps: true,
  }
);

Mantenimiento.associate = (models) => {
  Mantenimiento.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
  Mantenimiento.hasMany(models.TareaMantenimiento, { foreignKey: 'mantenimientoId', as: 'tareas' });
  // Mantenimiento.belongsTo(models.Empleado, { foreignKey: 'responsableId', as: 'responsable' }); // Si tienes modelo Empleado
};

module.exports = Mantenimiento;