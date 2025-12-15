const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const SubsistemaInstancia = sequelize.define('SubsistemaInstancia', {
  vehiculoInstanciaId: { type: DataTypes.INTEGER, allowNull: false }, // referencia al vehículo real
  subsistemaId: { type: DataTypes.INTEGER, allowNull: false }, // referencia al subsistema de plantilla
  nombre: { type: DataTypes.STRING, allowNull: false }, // Copia del nombre del subsistema
});

SubsistemaInstancia.associate = (models) => {
  SubsistemaInstancia.belongsTo(models.VehiculoInstancia, { foreignKey: 'vehiculoInstanciaId', as: 'vehiculoInstancia' });
  SubsistemaInstancia.belongsTo(models.Subsistema, { foreignKey: 'subsistemaId', as: 'subsistemaPlantilla' });
  SubsistemaInstancia.hasMany(models.Consumible, { foreignKey: 'subsistemaInstanciaId', as: 'consumibles' });
  SubsistemaInstancia.hasMany(models.ConsumibleSerializado, { foreignKey: 'subsistemaInstanciaId', as: 'consumiblesSerializados' });
  SubsistemaInstancia.hasMany(models.ConsumibleUsado, { foreignKey: 'subsistemaInstanciaId', as: 'consumiblesUsados' });
};
module.exports = SubsistemaInstancia;