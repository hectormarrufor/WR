import { DataTypes } from 'sequelize';
import Activo from './Activo.js';
import Usuario from './Usuario.js';
import sequelize from '../../sequelize.js';

// Asumimos que tienes un modelo de Usuario
// import Usuario from '../Usuario.js';

const OrdenTrabajo = sequelize.define('OrdenTrabajo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // Origen de la OT
  tipo_origen: {
    type: DataTypes.ENUM('inspeccion', 'preventivo', 'correctivo'),
    allowNull: false,
  },
  origen_id: { // ID de la inspección, plan de mantenimiento, etc.
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  descripcion_falla: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('abierta', 'planificada', 'en_progreso', 'completada', 'cancelada'),
    defaultValue: 'abierta',
  },
  prioridad: {
    type: DataTypes.ENUM('baja', 'media', 'alta', 'urgente'),
    defaultValue: 'media',
  },
  // Planificación
  // tecnicoAsignadoId: {
  //   type: DataTypes.INTEGER,
  //   references: { model: 'usuarios', key: 'id' }
  // },
  // Ejecución
  fecha_cierre: {
    type: DataTypes.DATE,
  },
  notas_tecnico: {
    type: DataTypes.TEXT,
  },
  // Costos para Análisis
  costo_mano_obra: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  costo_repuestos: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  tecnicoAsignadoId: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: { model: 'usuarios', key: 'id' }
},
}, {
  tableName: 'ordenes_trabajo',
  timestamps: true,
  getterMethods: {
    costo_total() {
      return (parseFloat(this.costo_mano_obra) || 0) + (parseFloat(this.costo_repuestos) || 0);
    }
  }
});

OrdenTrabajo.belongsTo(Activo, { foreignKey: 'activoId', as: 'activo' });
Activo.hasMany(OrdenTrabajo, { foreignKey: 'activoId', as: 'ordenes_trabajo' });
OrdenTrabajo.belongsTo(Usuario, { foreignKey: 'tecnicoAsignadoId', as: 'tecnico' });


// OrdenTrabajo.belongsTo(Usuario, { foreignKey: 'tecnicoAsignadoId', as: 'tecnico' });

export default OrdenTrabajo;