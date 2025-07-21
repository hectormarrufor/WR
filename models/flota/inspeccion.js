const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Inspeccion = sequelize.define(
  'Inspeccion',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    fechaInspeccion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    kilometrajeInspeccion: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    inspector: { // Quién realizó la inspección
      type: DataTypes.STRING,
      allowNull: true,
    },
    observacionesGenerales: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    horometro: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Relación con Vehículo
    vehiculoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Vehiculos',
        key: 'id',
      },
    },
  },
  {
    tableName: 'Inspecciones',
    timestamps: true,
  }
);

Inspeccion.associate = (models) => {
  Inspeccion.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
  Inspeccion.hasMany(models.HallazgoInspeccion, { foreignKey: 'inspeccionId', as: 'hallazgos' });
};

module.exports = Inspeccion;