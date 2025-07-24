// models/TipoVehiculo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');
const bcrypt = require('bcryptjs');

const TipoVehiculo = sequelize.define('TipoVehiculo', {
  label: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  peso: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  vehiculoId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Vehiculos', // Nombre de la tabla a la que se refiere
      key: 'id',
    },
    unique: true, // Una ficha técnica por vehículo
    allowNull: false,
  },
})

TipoVehiculo.associate = (models) => {
    TipoVehiculo.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId' });
};
module.exports = TipoVehiculo;
