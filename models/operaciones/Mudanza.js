// models/Mudanza.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');


const Mudanza = sequelize.define('Mudanza', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  renglonContratoId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'RenglonesContrato',
      key: 'id',
    },
    allowNull: false,
  },
  renglonContratoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'RenglonesContrato', // Usa el nombre de la tabla
      key: 'id'
    }
  },

  // --- CAMBIO CLAVE: AÑADIR ESTA CLAVE FORÁNEA ---
  unidadOperativaId: {
    type: DataTypes.INTEGER,
    allowNull: false, // Una mudanza siempre debe ser de una unidad específica
    references: {
      model: 'UnidadesOperativas', // Nombre de la tabla
      key: 'id'
    }
  },
  fechaInicio: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  puntoOrigen: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  puntoDestino: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  kilometrosRecorridos: {
    type: DataTypes.INTEGER, // O DataTypes.DECIMAL si puede tener decimales
    allowNull: true, // O false si es un campo obligatorio
    defaultValue: 0,
  },
  estado: {
    type: DataTypes.ENUM('Planificada', 'En Progreso', 'Finalizada', 'Cancelada'),
    defaultValue: 'Planificada',
    allowNull: false,
  },
  // Referencia al supervisor de la mudanza (si aplica)
  supervisorId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Empleados',
      key: 'id',
    },
    allowNull: true,
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'Mudanzas',
  timestamps: true,
});

Mudanza.associate = (models) => {
  Mudanza.belongsTo(models.RenglonContrato, { foreignKey: 'renglonContratoId', as: 'renglonContrato' });
  Mudanza.belongsTo(models.Empleado, { foreignKey: 'supervisorId', as: 'supervisor' });
  Mudanza.belongsTo(models.UnidadOperativa, { foreignKey: 'unidadOperativaId', as: 'unidadOperativa' });
  // Asignación de personal y vehículos a la mudanza
  Mudanza.hasMany(models.AsignacionPersonalMudanza, { foreignKey: 'mudanzaId', as: 'personalAsignado' });
  Mudanza.hasMany(models.AsignacionVehiculoMudanza, { foreignKey: 'mudanzaId', as: 'vehiculosAsignados' });
};

module.exports = Mudanza