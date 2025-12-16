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
  }
}, {
  tableName: 'TareasMantenimiento',
  timestamps: true
});

TareaMantenimiento.associate = function(models) {
  TareaMantenimiento.belongsTo(models.Mantenimiento, {
    foreignKey: 'ordenMantenimientoId',
    as: 'ordenMantenimiento'
  });
  TareaMantenimiento.belongsTo(models.SubsistemaInstancia, {
    foreignKey: 'subsistemaInstanciaId',
    as: 'subsistemaInstancia'
  });
  TareaMantenimiento.belongsTo(models.Mantenimiento, {
    foreignKey: 'mantenimientoId',
    as: 'mantenimiento'
  });
  TareaMantenimiento.hasMany(models.ConsumibleUsado, {
    foreignKey: 'tareaMantenimientoId',
    as: 'repuestosUsados'
  });
};

module.exports = TareaMantenimiento;