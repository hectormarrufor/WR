const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Mantenimiento = sequelize.define('Mantenimiento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  fechaIngreso: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  fechaEstimadaSalida: {
    type: DataTypes.DATE,
  },
  fechaCierre: {
    type: DataTypes.DATE, // Null hasta que se complete
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'En Progreso', 'Espera de Repuestos', 'Completada', 'Cancelada'),
    defaultValue: 'Pendiente'
  },
  tipoMantenimiento: {
    type: DataTypes.ENUM('Preventivo', 'Correctivo', 'Predictivo'),
    allowNull: false
  },
  prioridad: {
    type: DataTypes.ENUM('Baja', 'Media', 'Alta', 'Critica'),
    defaultValue: 'Media'
  },
  descripcionGeneral: {
    type: DataTypes.TEXT,
  },
  kilometrajeAlIngreso: {
    type: DataTypes.FLOAT,
    allowNull: false
  },

 
}, {
  tableName: 'Mantenimientos',
  timestamps: true,
});

Mantenimiento.associate = function(models) {
  Mantenimiento.belongsTo(models.VehiculoInstancia, {
    foreignKey: 'vehiculoInstanciaId',
    as: 'vehiculoInstancia'
  });
  Mantenimiento.hasMany(models.Requisicion, {
    foreignKey: 'mantenimientoId',
    as: 'requisiciones'
  });
  Mantenimiento.belongsTo(models.MaquinaInstancia, {
    foreignKey: 'maquinaInstanciaId',
    as: 'maquinaInstancia'
  });
  Mantenimiento.belongsTo(models.RemolqueInstancia, {
    foreignKey: 'remolqueInstanciaId',
    as: 'remolqueInstancia'
  });
  Mantenimiento.hasMany(models.TareaMantenimiento, {
    foreignKey: 'mantenimientoId',
    as: 'tareasMantenimiento'
  });
  Mantenimiento.hasMany(models.Hallazgo, {
    foreignKey: 'mantenimientoId',
    as: 'hallazgos'
  });
  
};

module.exports = Mantenimiento;