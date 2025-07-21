// models/operaciones/AsignacionSupervisorOperacion.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const AsignacionSupervisorOperacion = sequelize.define('AsignacionSupervisorOperacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  operacionCampoId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'OperacionesCampo',
      key: 'id',
    },
    allowNull: false,
  },
  supervisorId: { // El supervisor de guardia asignado a esta operación
    type: DataTypes.INTEGER,
    references: {
      model: 'Empleados',
      key: 'id',
    },
    allowNull: false,
  },
  fechaInicioAsignacion: { // Fecha en que este supervisor empieza en esta operación
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  fechaFinAsignacion: { // Fecha en que este supervisor termina en esta operación
    type: DataTypes.DATEONLY,
    allowNull: true, // Puede ser null si la asignación está activa y sin fecha de fin definida
  },
  // Estado de esta asignación específica (activa, completada, etc.)
  estadoAsignacion: {
    type: DataTypes.ENUM('Activa', 'Completada', 'Reemplazada'),
    defaultValue: 'Activa',
    allowNull: false,
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'AsignacionesSupervisorOperacion',
  timestamps: true,
  
});

AsignacionSupervisorOperacion.associate = (models) => {
  AsignacionSupervisorOperacion.belongsTo(models.OperacionCampo, { foreignKey: 'operacionCampoId', as: 'operacion' });
  AsignacionSupervisorOperacion.belongsTo(models.Empleado, { foreignKey: 'supervisorId', as: 'supervisorAsignado' });
};

module.exports = AsignacionSupervisorOperacion;