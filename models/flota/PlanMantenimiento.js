const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const PlanMantenimiento = sequelize.define('PlanMantenimiento', {
  id_plan: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_tipo_activo: {
    type: DataTypes.INTEGER,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  frecuencia_dias: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  frecuencia_horas_uso: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  proxima_fecha_vencimiento: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  proximas_horas_vencimiento: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'PlanesMantenimiento',
  timestamps: true,
});

PlanMantenimiento.associate = (models) => {
  // Un plan puede aplicar a un tipo de activo o a un activo específico
  PlanMantenimiento.belongsTo(models.Activo, { foreignKey: 'id_activo', allowNull: true });
  PlanMantenimiento.belongsTo(models.CategoriaActivo, { foreignKey: 'id_tipo_activo', allowNull: true });
};

module.exports = PlanMantenimiento;