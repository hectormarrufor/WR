const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const RemolqueInstancia = sequelize.define('RemolqueInstancia', {
  placa: { type: DataTypes.STRING, allowNull: false, unique: true },
  color: { type: DataTypes.STRING, allowNull: false },
  serialChasis: { type: DataTypes.STRING, allowNull: false },
  serialMotor: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'InstanciasRemolques'
});

RemolqueInstancia.associate = (models) => {
  RemolqueInstancia.belongsTo(models.Remolque, { foreignKey: 'remolqueId', as: 'plantilla' });
  RemolqueInstancia.hasMany(models.SubsistemaInstancia, { foreignKey: 'remolqueInstanciaId', as: 'subsistemas' });
  RemolqueInstancia.hasMany(models.Mantenimiento, { foreignKey: 'remolqueInstanciaId', as: 'mantenimientos' });
  RemolqueInstancia.hasMany(models.ConsumibleUsado, { foreignKey: 'remolqueInstanciaId', as: 'consumiblesUsados' });
  RemolqueInstancia.hasMany(models.Inspeccion, { foreignKey: 'remolqueInstanciaId', as: 'inspecciones' });
  RemolqueInstancia.hasOne(models.Activo, { foreignKey: 'remolqueInstanciaId', as: 'activo' });
}

module.exports =    RemolqueInstancia;