// models/AsignacionVehiculoOperacion.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');


  const AsignacionVehiculoOperacion = sequelize.define('AsignacionVehiculoOperacion', {
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
    vehiculoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Vehiculos',
        key: 'id',
      },
      allowNull: false,
    },
    fechaAsignacion: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
    },
    fechaFinAsignacion: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    proposito: { // Ej: "Traslado personal", "Soporte", "Vehículo principal de Rig"
      type: DataTypes.STRING,
      allowNull: true,
    },
    choferId: { // Chofer principal asignado a este vehículo en esta operación
      type: DataTypes.INTEGER,
      references: {
        model: 'Empleados',
        key: 'id',
      },
      allowNull: true,
    },
  }, {
    tableName: 'AsignacionesVehiculoOperacion',
    timestamps: true,
  });

  AsignacionVehiculoOperacion.associate = (models) => {
    AsignacionVehiculoOperacion.belongsTo(models.OperacionCampo, { foreignKey: 'operacionCampoId', as: 'operacionCampo' });
    AsignacionVehiculoOperacion.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
    AsignacionVehiculoOperacion.belongsTo(models.Empleado, { foreignKey: 'choferId', as: 'chofer' });
  };

module.exports = AsignacionVehiculoOperacion