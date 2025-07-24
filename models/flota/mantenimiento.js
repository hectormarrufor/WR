const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Mantenimiento = sequelize.define('Mantenimiento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // --- MODIFICACIÓN POLIMÓRFICA ---
  // Reemplazamos 'vehiculoId' por estos dos campos genéricos
  activoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  activoTipo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // ------------------------------------
  
  // Tus campos existentes se mantienen intactos
  tipo: { type: DataTypes.ENUM('Preventivo', 'Correctivo'), allowNull: false },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  costo: { type: DataTypes.DECIMAL(10, 2) },
  estado: { type: DataTypes.ENUM('Programado', 'En Progreso', 'Completado', 'Cancelado'), defaultValue: 'Completado' },
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Empleados', key: 'id' },
  },
}, {
  tableName: 'Mantenimientos',
  timestamps: true,
});

Mantenimiento.associate = (models) => {
  // 1. La asociación a Vehiculo se elimina de aquí.
  // 2. La asociación a Usuario se mantiene.
  Mantenimiento.belongsTo(models.Empleado, { foreignKey: 'usuarioId', as: 'usuario' });

  // 3. ¡IMPORTANTE! Las asociaciones con los modelos HIJOS se mantienen exactamente igual.
  Mantenimiento.hasMany(models.TareaMantenimiento, { foreignKey: 'mantenimientoId', as: 'tareas' });
  Mantenimiento.hasMany(models.ConsumibleUsado, { foreignKey: 'mantenimientoId', as: 'consumiblesUsados' });
};

module.exports = Mantenimiento;