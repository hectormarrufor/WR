const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const VehiculoInstancia = sequelize.define('VehiculoInstancia', {
  placa: { type: DataTypes.STRING, allowNull: false, unique: true },
  color: { type: DataTypes.STRING, allowNull: true },
  serialChasis: { type: DataTypes.STRING, allowNull: true },
  serialMotor: { type: DataTypes.STRING, allowNull: true },
  vehiculoId: { type: DataTypes.INTEGER, allowNull: false } // referencia a la plantilla
}, {
  tableName: 'InstanciasVehiculos'
});

VehiculoInstancia.associate = (models) => {
  VehiculoInstancia.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'plantilla' });
  VehiculoInstancia.hasOne(models.Activo, { foreignKey: 'vehiculoInstanciaId', as: 'activo' });
}

module.exports = VehiculoInstancia;