const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const VehiculoInstancia = sequelize.define('VehiculoInstancia', {
  placa: { type: DataTypes.STRING, allowNull: false, unique: true },
  color: { type: DataTypes.STRING, allowNull: true },
  serialChasis: { type: DataTypes.STRING, allowNull: true },
  serialMotor: { type: DataTypes.STRING, allowNull: true },
  estado: { type: DataTypes.ENUM('operativo', 'en_mantenimiento', 'fuera_de_servicio'), allowNull: false, defaultValue: 'operativo' },
}, {
  tableName: 'VehiculosInstancias'
});

VehiculoInstancia.associate = (models) => {
  VehiculoInstancia.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'plantilla', onDelete: 'CASCADE' });
  VehiculoInstancia.hasOne(models.Activo, { foreignKey: 'vehiculoInstanciaId', as: 'activo', onDelete: 'CASCADE' });


}

module.exports = VehiculoInstancia;