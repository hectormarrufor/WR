const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const EstadoSistemaVehiculo = sequelize.define('EstadoSistemaVehiculo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombreSistema: { // Ej: 'Luces', 'Frenos', 'Neumáticos', 'Motor', 'Transmisión', 'Suspensión', 'Batería', 'Dirección'
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: { // Ej: 'Operativo', 'Advertencia', 'Fallo Crítico', 'No Aplica'
      type: DataTypes.ENUM('Operativo', 'Advertencia', 'Fallo Crítico', 'No Aplica'),
      allowNull: false,
    },
    fechaActualizacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    vehiculoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Vehiculos',
        key: 'id',
      },
      allowNull: false,
    },
    // Opcional: Podrías vincularlo a un HallazgoInspeccion si este estado se determinó en una inspección
    hallazgoInspeccionId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'HallazgoInspecciones',
        key: 'id',
      },
      allowNull: true,
    },
  });

  EstadoSistemaVehiculo.associate = (models) => {
    EstadoSistemaVehiculo.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
    EstadoSistemaVehiculo.belongsTo(models.HallazgoInspeccion, { foreignKey: 'hallazgoInspeccionId', as: 'hallazgoOrigen' });
  };

  module.exports = EstadoSistemaVehiculo;