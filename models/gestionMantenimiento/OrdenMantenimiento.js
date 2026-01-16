const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const OrdenMantenimiento = sequelize.define('OrdenMantenimiento', {
  codigo: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false // Ej: OM-2026-001
  },
  fechaApertura: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  fechaCierre: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tipo: {
    type: DataTypes.ENUM('Correctivo', 'Preventivo', 'Predictivo'),
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM(
      'Diagnostico',      // Mecánico evaluando
      'Esperando Stock',  // Faltan repuestos (Requisición activa)
      'Por Ejecutar',     // Repuestos listos, esperando turno
      'En Ejecucion',     // Mecánico trabajando
      'Finalizada',       // Trabajo terminado
      'Cancelada'
    ),
    defaultValue: 'Diagnostico'
  },
  diagnosticoTecnico: {
    type: DataTypes.TEXT, // Explicación técnica de la solución
    allowNull: true
  },
  prioridad: {
    type: DataTypes.ENUM('Baja', 'Media', 'Alta', 'Emergencia'),
    defaultValue: 'Media'
  }
}, {
  tableName: 'OrdenesMantenimiento'
});

OrdenMantenimiento.associate = (models) => {
  OrdenMantenimiento.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo' });
  // Quién abrió la orden (Jefe de Taller/Planificador)
  OrdenMantenimiento.belongsTo(models.User, { foreignKey: 'creadoPorId', as: 'creadoPor' });
  // Quién ejecuta (Mecánico Líder)
  OrdenMantenimiento.belongsTo(models.Empleado, { foreignKey: 'asignadoAId', as: 'asignadoA' });
  
  OrdenMantenimiento.hasMany(models.Hallazgo, { foreignKey: 'ordenMantenimientoId', as: 'hallazgosAtendidos' });
  OrdenMantenimiento.hasMany(models.MantenimientoRepuesto, { foreignKey: 'ordenMantenimientoId', as: 'repuestos' });
  OrdenMantenimiento.hasMany(models.TareaMantenimiento, { foreignKey: 'ordenMantenimientoId', as: 'tareas' });
};

module.exports = OrdenMantenimiento;