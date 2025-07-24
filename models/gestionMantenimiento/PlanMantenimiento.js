import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import Activo from './Activo.js';

const PlanMantenimiento = sequelize.define('PlanMantenimiento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipo_disparador: {
    type: DataTypes.ENUM('horas', 'kilometros', 'dias'),
    allowNull: false,
  },
  intervalo: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ultima_ejecucion_valor: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  ultima_ejecucion_fecha: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'planes_mantenimiento',
  timestamps: true,
});

PlanMantenimiento.belongsTo(Activo, {
  foreignKey: 'activoId',
  as: 'activo',
});
Activo.hasMany(PlanMantenimiento, {
  foreignKey: 'activoId',
  as: 'planes_mantenimiento'
});

export default PlanMantenimiento;