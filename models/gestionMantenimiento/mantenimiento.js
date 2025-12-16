const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const OrdenMantenimiento = sequelize.define('OrdenMantenimiento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: "Ej: OM-2024-001"
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
    comment: "Descripción del jefe de taller sobre el trabajo a realizar"
  },
  kilometrajeAlIngreso: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  // Relaciones
  vehiculoInstanciaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'vehiculo_instancias',
      key: 'id'
    }
  },
  // Por si el activo no es un vehículo (ej. una Planta Eléctrica o Maquina Amarilla)
  maquinaInstanciaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
}, {
  tableName: 'ordenes_mantenimiento',
  timestamps: true,
});

OrdenMantenimiento.associate = function(models) {
  OrdenMantenimiento.belongsTo(models.VehiculoInstancia, {
    foreignKey: 'vehiculoInstanciaId',
    as: 'vehiculoInstancia'
  });
  OrdenMantenimiento.belongsTo(models.MaquinaInstancia, {
    foreignKey: 'maquinaInstanciaId',
    as: 'maquinaInstancia'
  });
  OrdenMantenimiento.belongsTo(models.RemolqueInstancia, {
    foreignKey: 'remolqueInstanciaId',
    as: 'remolqueInstancia'
  });
  OrdenMantenimiento.hasMany(models.TareaMantenimiento, {
    foreignKey: 'ordenMantenimientoId',
    as: 'tareasMantenimiento'
  });
  OrdenMantenimiento.hasMany(models.Hallazgo, {
    foreignKey: 'ordenMantenimientoId',
    as: 'hallazgos'
  });
  C
};

module.exports = OrdenMantenimiento;