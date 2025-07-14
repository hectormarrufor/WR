// models/AsignacionVehiculoMudanza.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');


  const AsignacionVehiculoMudanza = sequelize.define('AsignacionVehiculoMudanza', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    mudanzaId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Mudanzas',
        key: 'id',
      },
      allowNull: false,
    },
    vehiculoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Vehiculos', // Asumo que ya tienes un modelo Vehiculo
        key: 'id',
      },
      allowNull: false,
    },
    tipoVehiculoMudanza: { // Ej: "Camión Plataforma", "Grúa", "Pick-up de Apoyo"
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Tipo de vehículo asignado para esta mudanza.',
    },
    conductorId: { // El chofer específico de este vehículo en la mudanza
      type: DataTypes.INTEGER,
      references: {
        model: 'Empleados',
        key: 'id',
      },
      allowNull: true,
    },
  }, {
    tableName: 'AsignacionesVehiculoMudanza',
    timestamps: true,
  });

  AsignacionVehiculoMudanza.associate = (models) => {
    AsignacionVehiculoMudanza.belongsTo(models.Mudanza, { foreignKey: 'mudanzaId', as: 'mudanza' });
    AsignacionVehiculoMudanza.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
    AsignacionVehiculoMudanza.belongsTo(models.Empleado, { foreignKey: 'conductorId', as: 'conductor' });
  };

module.exports = AsignacionVehiculoMudanza