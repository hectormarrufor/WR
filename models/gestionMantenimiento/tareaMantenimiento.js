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
  estado: {
    type: DataTypes.ENUM('Pendiente', 'Completada'),
    defaultValue: 'Pendiente'
  },
  costoManoObraEstimado: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  ordenMantenimientoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'ordenes_mantenimiento', key: 'id' }
  },
  // Scope: ¿Sobre qué subsistema se actúa?
  subsistemaInstanciaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'subsistema_instancias', key: 'id' }
  }
}, {
  tableName: 'tareas_mantenimiento',
  timestamps: true
});

TareaMantenimiento.associate = function(models) {
  TareaMantenimiento.belongsTo(models.OrdenMantenimiento, {
    foreignKey: 'ordenMantenimientoId',
    as: 'ordenMantenimiento'
  });
  TareaMantenimiento.hasMany(models.ConsumibleUsado, {
    foreignKey: 'tareaMantenimientoId',
    as: 'repuestosUsados'
  });
};

module.exports = TareaMantenimiento;