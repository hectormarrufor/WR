// models/logistica/RegistroMovimientoPersonal.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const RegistroMovimientoPersonal = sequelize.define('RegistroMovimientoPersonal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  empleadoId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Empleados',
      key: 'id',
    },
    allowNull: false,
  },
  fechaHoraMovimiento: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  tipoMovimiento: {
    type: DataTypes.ENUM('Traslado a Campo', 'Traslado a Base', 'Cambio de Guardia en Campo'),
    allowNull: false,
  },
  origen: {
    type: DataTypes.STRING, // Ej. "Base", "Pozo X", "Operación Y"
    allowNull: false,
  },
  destino: {
    type: DataTypes.STRING, // Ej. "Pozo X", "Base", "Operación Z"
    allowNull: false,
  },
  operacionCampoId: { // Si el movimiento está relacionado con una operación
    type: DataTypes.INTEGER,
    references: {
      model: 'OperacionesCampo',
      key: 'id',
    },
    allowNull: true,
  },
  vehiculoAsignadoId: { // Si el movimiento se realizó en un vehículo específico
    type: DataTypes.INTEGER,
    references: {
      model: 'Vehiculos', // Asumiendo que tienes un modelo Vehiculo
      key: 'id',
    },
    allowNull: true,
  },
  supervisorResponsableId: { // Quien autoriza/registra el movimiento
    type: DataTypes.INTEGER,
    references: {
      model: 'Empleados',
      key: 'id',
    },
    allowNull: true, // Podría ser el supervisor de turno
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'RegistrosMovimientosPersonal',
  timestamps: true,
});

RegistroMovimientoPersonal.associate = (models) => {
  RegistroMovimientoPersonal.belongsTo(models.Empleado, { foreignKey: 'empleadoId', as: 'empleadoMovilizado' });
  RegistroMovimientoPersonal.belongsTo(models.OperacionCampo, { foreignKey: 'operacionCampoId', as: 'operacionAsociada' });
  RegistroMovimientoPersonal.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoAsignadoId', as: 'vehiculoUtilizado' });
  RegistroMovimientoPersonal.belongsTo(models.Empleado, { foreignKey: 'supervisorResponsableId', as: 'supervisorResponsable' });
};

module.exports = RegistroMovimientoPersonal;