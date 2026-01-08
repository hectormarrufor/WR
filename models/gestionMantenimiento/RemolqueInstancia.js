const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const RemolqueInstancia = sequelize.define('RemolqueInstancia', {
  marca: { type: DataTypes.STRING, allowNull: false },
  modelo: { type: DataTypes.STRING, allowNull: false },
  anio: { type: DataTypes.INTEGER, allowNull: false },
  peso: { type: DataTypes.FLOAT, allowNull: true },
  capacidadCarga: { type: DataTypes.FLOAT, allowNull: true },
  placa: { type: DataTypes.STRING, allowNull: false, unique: true },
  color: { type: DataTypes.STRING, allowNull: false },
  serialChasis: { type: DataTypes.STRING, allowNull: false },
  serialMotor: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'RemolquesInstancias'
});

RemolqueInstancia.associate = (models) => {
  RemolqueInstancia.belongsTo(models.Remolque, { foreignKey: 'remolqueId', as: 'plantilla' , onDelete: 'CASCADE' });
  RemolqueInstancia.hasOne(models.Activo, { foreignKey: 'remolqueInstanciaId', as: 'activo', onDelete: 'CASCADE' });
}

module.exports =    RemolqueInstancia;