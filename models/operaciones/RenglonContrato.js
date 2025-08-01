// models/RenglonContrato.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');


const RenglonContrato = sequelize.define('RenglonContrato', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombreRenglon: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pozoNombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ubicacionPozo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fechaInicioEstimada: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fechaFinEstimada: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM('Pendiente', 'En Preparación', 'Mudanza', 'Operando', 'Finalizado', 'Pausado', 'Cancelado'),
      defaultValue: 'Pendiente',
      allowNull: false,
    },
    contratoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'ContratosServicio',
        key: 'id',
      },
      allowNull: false,
    },
    // Puedes añadir más campos específicos del renglón (ej. tipo de servicio)
  }, {
    tableName: 'RenglonesContrato',
    timestamps: true,
  });

  RenglonContrato.associate = (models) => {
    RenglonContrato.belongsTo(models.ContratoServicio, { foreignKey: 'contratoId', as: 'contrato' });
    RenglonContrato.hasOne(models.Mudanza, { foreignKey: 'renglonContratoId', as: 'mudanza' });
    RenglonContrato.hasOne(models.OperacionCampo, { foreignKey: 'renglonContratoId', as: 'operacionCampo' });
    RenglonContrato.hasMany(models.TrabajoExtra, { foreignKey: 'renglonContratoId', as: 'trabajosExtra' });
    RenglonContrato.hasMany(models.ConsumoAlimento, { foreignKey: 'renglonContratoId', as: 'consumoAlimentos' });
  };

module.exports = RenglonContrato