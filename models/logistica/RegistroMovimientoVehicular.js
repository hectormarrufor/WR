// models/logistica/RegistroMovimientoVehicular.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const RegistroMovimientoVehicular = sequelize.define('RegistroMovimientoVehicular', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  vehiculoId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Vehiculos',
      key: 'id',
    },
    allowNull: false,
  },
  fechaHoraSalida: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  fechaHoraLlegada: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  origen: {
    type: DataTypes.STRING, // Ej. "Base", "Pozo A", "Almacén"
    allowNull: false,
  },
  destino: {
    type: DataTypes.STRING, // Ej. "Pozo B", "Base", "Taller"
    allowNull: false,
  },
  motivoMovimiento: {
    type: DataTypes.ENUM(
      'Traslado Personal', 
      'Traslado Repuestos', 
      'Traslado Equipo', 
      'Mantenimiento', 
      'Inspección', 
      'Otro'
    ),
    allowNull: false,
  },
  operacionCampoId: { // Si el traslado es parte de una operación
    type: DataTypes.INTEGER,
    references: {
      model: 'OperacionesCampo',
      key: 'id',
    },
    allowNull: true,
  },
  kilometrajeSalida: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  kilometrajeLlegada: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  // Conductor asignado al vehículo para este movimiento
  conductorId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Empleados', // Asumiendo que Empleados también son conductores
      key: 'id',
    },
    allowNull: true,
  },
  // Opcional: Información sobre lo que se traslada
  personalTrasladado: {
    type: DataTypes.JSONB, // Array de empleadoIds o nombres
    allowNull: true,
  },
  repuestosTrasladados: {
    type: DataTypes.JSONB, // Array de { repuestoId, cantidad }
    allowNull: true,
  },
  equiposTrasladados: {
    type: DataTypes.JSONB, // Array de { equipoId, cantidad }
    allowNull: true,
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'RegistrosMovimientosVehiculares',
  timestamps: true,
});

RegistroMovimientoVehicular.associate = (models) => {
  RegistroMovimientoVehicular.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculoMovilizado' });
  RegistroMovimientoVehicular.belongsTo(models.OperacionCampo, { foreignKey: 'operacionCampoId', as: 'operacionAsociada' });
  RegistroMovimientoVehicular.belongsTo(models.Empleado, { foreignKey: 'conductorId', as: 'conductorAsignado' });
};

module.exports = RegistroMovimientoVehicular;