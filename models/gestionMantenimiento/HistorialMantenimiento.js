import { DataTypes } from 'sequelize';
import Activo from './Activo.js';
import OrdenTrabajo from './OrdenTrabajo.js';
import sequelize from '../../sequelize.js';


const HistorialMantenimiento = sequelize.define('HistorialMantenimiento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  costo: {
    type: DataTypes.DECIMAL(10, 2),
  },
  responsable: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'historial_mantenimientos',
  timestamps: true,
});

HistorialMantenimiento.belongsTo(Activo, {
  foreignKey: 'activoId',
  as: 'activo',
});

HistorialMantenimiento.belongsTo(OrdenTrabajo, {
  foreignKey: 'ordenTrabajoId',
  as: 'orden_trabajo',
});

export default HistorialMantenimiento;