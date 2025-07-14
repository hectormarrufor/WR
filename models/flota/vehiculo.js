const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Vehiculo = sequelize.define(
  'Vehiculo',
  {
    marca: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modelo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    imagen: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    placa: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vin: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ano: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estadoOperativoGeneral: { // <-- Nuevo campo para el estado general
      type: DataTypes.ENUM('Operativo', 'Operativo con Advertencias', 'No Operativo', 'En Taller', 'Desconocido'),
      defaultValue: 'Desconocido',
      allowNull: false,
    },


  },
  {
    tableName: 'Vehiculos',
    timestamps: true,
  }
);

Vehiculo.associate = (models) => {
  Vehiculo.hasOne(models.FichaTecnica, { foreignKey: 'vehiculoId', as: 'fichaTecnica' });
  Vehiculo.hasMany(models.Kilometraje, { foreignKey: 'vehiculoId', as: 'kilometrajes' });
  Vehiculo.hasMany(models.Horometro, { foreignKey: 'vehiculoId', as: 'horometros' });
  Vehiculo.hasMany(models.Inspeccion, { foreignKey: 'vehiculoId', as: 'inspecciones' });
  Vehiculo.hasMany(models.Mantenimiento, { foreignKey: 'vehiculoId', as: 'mantenimientos' });
  Vehiculo.hasMany(models.EstadoSistemaVehiculo, { foreignKey: 'vehiculoId', as: 'estadosSistemas' }); // Nueva asociación
};

module.exports = Vehiculo;