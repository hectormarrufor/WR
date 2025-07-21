// models/recursosHumanos/RegistroGuardia.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const RegistroGuardia = sequelize.define('RegistroGuardia', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  empleadoId: { // El empleado que es supervisor de operaciones
    type: DataTypes.INTEGER,
    references: {
      model: 'Empleados',
      key: 'id',
    },
    allowNull: false,
  },
  fechaInicioGuardia: {
    type: DataTypes.DATEONLY, // La fecha en que inicia su período de guardia
    allowNull: false,
  },
  fechaFinGuardia: {
    type: DataTypes.DATEONLY, // La fecha en que termina su período de guardia
    allowNull: false,
  },
  tipoGuardia: { // Referencia al tipo de horario de su puesto (3x3, 7x7)
    type: DataTypes.ENUM('Guardia 3x3', 'Guardia 7x7'),
    allowNull: false,
  },
  estadoGuardia: { // Para saber si está activa, planificada o terminada
    type: DataTypes.ENUM('Planificada', 'Activa', 'Completada', 'Cancelada'),
    defaultValue: 'Planificada',
    allowNull: false,
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'RegistrosGuardias',
  timestamps: true,
  // Se podría añadir un índice para optimizar consultas por supervisor y fecha
  // indexes: [
  //   {
  //     fields: ['empleadoId', 'fechaInicioGuardia', 'fechaFinGuardia']
  //   },
  //   // { // Opcional: Índice para buscar guardias activas en un rango de fechas
  //   //   name: 'idx_guardias_activas_fechas',
  //   //   fields: ['fechaInicioGuardia', 'fechaFinGuardia'],
  //   // }
  // ]
});

RegistroGuardia.associate = (models) => {
  RegistroGuardia.belongsTo(models.Empleado, { foreignKey: 'empleadoId', as: 'empleado' });
  // Opcional: Podrías relacionarlo con Puesto para validar tipoGuardia, pero ya se asume por el empleado

};

module.exports = RegistroGuardia;