// models/OperacionCampo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');


  const OperacionCampo = sequelize.define('OperacionCampo', {
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
    },
    fechaFinEstimada: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fechaFinReal: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tiempoTotalEstadia: {
      type: DataTypes.DECIMAL(10, 2), // En días o horas
      allowNull: true,
    },
    tiempoNoOperado: {
      type: DataTypes.DECIMAL(10, 2), // En horas
      defaultValue: 0,
      allowNull: false,
    },
    motivoNoOperado: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Asignaciones de personal clave directamente en la operación:
    supervisorId: { // Asignado a OperacionCampo
      type: DataTypes.INTEGER,
      references: {
        model: 'Empleados',
        key: 'id',
      },
      allowNull: true,
    },
    mecanicoId: { // Asignado a OperacionCampo
      type: DataTypes.INTEGER,
      references: {
        model: 'Empleados',
        key: 'id',
      },
      allowNull: true,
    },
    montacargistaId: { // Asignado a OperacionCampo
      type: DataTypes.INTEGER,
      references: {
        model: 'Empleados',
        key: 'id',
      },
      allowNull: true,
    },
    perforadorId: { // Si la empresa pone el personal de taladro
      type: DataTypes.INTEGER,
      references: {
        model: 'Empleados',
        key: 'id',
      },
      allowNull: true,
    },
    encuelladorId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Empleados',
        key: 'id',
      },
      allowNull: true,
    },
    llaveroId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Empleados',
        key: 'id',
      },
      allowNull: true,
    },
    cuneroId: {
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
    tableName: 'OperacionesCampo',
    timestamps: true,
  });

  OperacionCampo.associate = (models) => {
    OperacionCampo.belongsTo(models.RenglonContrato, { foreignKey: 'renglonContratoId', as: 'renglonContrato' });
    OperacionCampo.belongsTo(models.Empleado, { foreignKey: 'supervisorId', as: 'supervisor' });
    OperacionCampo.belongsTo(models.Empleado, { foreignKey: 'mecanicoId', as: 'mecanico' });
    OperacionCampo.belongsTo(models.Empleado, { foreignKey: 'montacargistaId', as: 'montacargista' });
    OperacionCampo.belongsTo(models.Empleado, { foreignKey: 'perforadorId', as: 'perforador' });
    OperacionCampo.belongsTo(models.Empleado, { foreignKey: 'encuelladorId', as: 'encuellador' });
    OperacionCampo.belongsTo(models.Empleado, { foreignKey: 'llaveroId', as: 'llavero' });
    OperacionCampo.belongsTo(models.Empleado, { foreignKey: 'cuneroId', as: 'cunero' });
    OperacionCampo.hasMany(models.Factura, { foreignKey: 'operacionCampoId' });
    // Puedes tener asignaciones de vehículos también para el día a día en el pozo
    OperacionCampo.hasMany(models.AsignacionVehiculoOperacion, { foreignKey: 'operacionCampoId', as: 'vehiculosAsignados' });
    OperacionCampo.hasMany(models.AsignacionSupervisorOperacion, { 
    foreignKey: 'operacionCampoId', 
    as: 'historialSupervisores' 
  });
  };

  module.exports = OperacionCampo;
