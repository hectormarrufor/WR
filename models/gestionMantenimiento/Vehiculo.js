const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Vehiculo = sequelize.define('Vehiculo', {
  modelo: { type: DataTypes.STRING, allowNull: false },
  anio: { type: DataTypes.INTEGER, allowNull: true }
});

Vehiculo.associate = (models) => {
  Vehiculo.hasMany(models.InstanciaVehiculo, { foreignKey: 'vehiculoId', as: 'instancias' });
  Vehiculo.hasMany(models.Subsistema, { foreignKey: 'vehiculoId', as: 'subsistemas' });
}
module.exports = Vehiculo;