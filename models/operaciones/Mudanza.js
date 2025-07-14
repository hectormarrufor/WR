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
    fechaInicio: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha y hora de inicio de la mudanza.',
    },
    fechaFinEstimada: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora estimada de finalización.',
    },
    fechaFinReal: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora real de finalización.',
    },
    puntoOrigen: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Lugar de donde sale la maquinaria (ej. Base de Operaciones, Pozo anterior).',
    },
    puntoDestino: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Lugar al que se dirige la maquinaria (ej. Pozo X).',
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
    // Asignación de personal y vehículos a la mudanza
    Mudanza.hasMany(models.AsignacionPersonalMudanza, { foreignKey: 'mudanzaId', as: 'personalAsignado' });
    Mudanza.hasMany(models.AsignacionVehiculoMudanza, { foreignKey: 'mudanzaId', as: 'vehiculosAsignados' });
  };

module.exports = Mudanza