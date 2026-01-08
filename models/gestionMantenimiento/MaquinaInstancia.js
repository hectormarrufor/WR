const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const MaquinaInstancia = sequelize.define('MaquinaInstancia', {
  serialChasis: { type: DataTypes.STRING, allowNull: false, unique: true },
  serialMotor: { type: DataTypes.STRING, allowNull: true },
  placa: { type: DataTypes.STRING, allowNull: true, unique: true },
},
{
  tableName: 'MaquinasInstancias'
});

MaquinaInstancia.associate = (models) => {
  MaquinaInstancia.belongsTo(models.Maquina, { foreignKey: 'maquinaId', as: 'plantilla', onDelete: 'CASCADE' });
  MaquinaInstancia.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo', onDelete: 'CASCADE' });
  
}

module.exports = MaquinaInstancia;