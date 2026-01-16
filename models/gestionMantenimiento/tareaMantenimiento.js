const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const TareaMantenimiento = sequelize.define('TareaMantenimiento', {
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false // Ej: "Calibrar válvulas", "Sustituir filtro de aire"
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'En Proceso', 'Completada', 'Omitida'),
    defaultValue: 'Pendiente'
  },
  // Trazabilidad de tiempo (KPI: Eficiencia de mano de obra)
  horasEstimadas: {
    type: DataTypes.DECIMAL(4, 2), // Ej: 1.5 horas
    defaultValue: 0
  },
  horasReales: {
    type: DataTypes.DECIMAL(4, 2), // Ej: Tardó 2.0 horas (Ineficiencia)
    allowNull: true
  },
  observacionTecnica: {
    type: DataTypes.TEXT, // El mecánico escribe: "Estaba muy apretado"
    allowNull: true
  },
  // Opcional: ¿Es una tarea crítica que requiere validación de un supervisor?
  requiereSupervision: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'TareasMantenimiento'
});

TareaMantenimiento.associate = (models) => {
  // Pertenece a una Orden específica
  TareaMantenimiento.belongsTo(models.OrdenMantenimiento, { foreignKey: 'ordenMantenimientoId', as: 'orden' });
  
  // ¿Quién ejecutó ESTA tarea específica? (Puede ser distinto al responsable de la ODT)
  TareaMantenimiento.belongsTo(models.User, { foreignKey: 'mecanicoId', as: 'mecanico' });
  
  // Relación con el subsistema (Para saber que esta tarea fue en "Frenos" y no en "Motor")
  TareaMantenimiento.belongsTo(models.SubsistemaInstancia, { foreignKey: 'subsistemaInstanciaId', as: 'subsistema' });
  TareaMantenimiento.hasMany(models.MantenimientoRepuesto, { 
    foreignKey: 'tareaMantenimientoId', 
    as: 'repuestosRequeridos' 
  });
};

module.exports = TareaMantenimiento;