const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const RemolqueInstancia = sequelize.define('RemolqueInstancia', {
  placa: { type: DataTypes.STRING, allowNull: false, unique: true },
  color: { type: DataTypes.STRING, allowNull: false },
  serialChasis: { type: DataTypes.STRING, allowNull: false },
  serialMotor: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'RemolquesInstancias'
});

RemolqueInstancia.associate = (models) => {
  RemolqueInstancia.belongsTo(models.Remolque, { foreignKey: 'remolqueId', as: 'plantilla' });
  RemolqueInstancia.hasOne(models.Activo, { foreignKey: 'remolqueInstanciaId', as: 'activo' });
}

module.exports =    RemolqueInstancia;