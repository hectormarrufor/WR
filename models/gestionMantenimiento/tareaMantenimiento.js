// models/flota/tareaMantenimiento.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize.js'); // Asegúrate que la ruta es correcta

const TareaMantenimiento = sequelize.define('TareaMantenimiento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  mantenimientoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Mantenimientos', // Nombre de la tabla de Mantenimientos
      key: 'id',
    },
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'En Progreso', 'Completada', 'Cancelada'),
    defaultValue: 'Pendiente',
  },
  fechaInicio: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fechaFin: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  costoEstimado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  costoReal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  hallazgoInspeccionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'HallazgosInspeccion', // Nombre de la tabla de HallazgosInspeccion
      key: 'id',
    },
  },
  // ¡NUEVO CAMPO! Tipo de mantenimiento a nivel de tarea
  tipo: {
    type: DataTypes.ENUM('Preventivo', 'Correctivo', 'Predictivo'),
    allowNull: false, // Ahora cada tarea debe tener un tipo
    defaultValue: 'Correctivo', // Valor por defecto si viene de un hallazgo (que suele ser correctivo)
  },
}, {
  tableName: 'TareasMantenimiento',
  timestamps: true,
});

TareaMantenimiento.associate = (models) => {
  TareaMantenimiento.belongsTo(models.Mantenimiento, { foreignKey: 'mantenimientoId', as: 'mantenimiento' });
  TareaMantenimiento.belongsTo(models.HallazgoInspeccion, { foreignKey: 'hallazgoInspeccionId', as: 'hallazgoOrigen' });
   TareaMantenimiento.hasMany(models.ConsumibleUsado, { foreignKey: 'tareaMantenimientoId', as: 'consumiblesUsados' }); // Asegúrate que 'tareaMantenimientoId' es la FK en ConsumibleUsado
};

module.exports = TareaMantenimiento;