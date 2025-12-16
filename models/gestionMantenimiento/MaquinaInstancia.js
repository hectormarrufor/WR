const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const MaquinaInstancia = sequelize.define('MaquinaInstancia', {
  tipo: { type: DataTypes.STRING, allowNull: false }, // Ej: "soldadora"
  potencia: { type: DataTypes.STRING, allowNull: true }
},
{
  tableName: 'MaquinasInstancias'
});

MaquinaInstancia.associate = (models) => {
  MaquinaInstancia.belongsTo(models.Maquina, { foreignKey: 'maquinaId', as: 'plantilla' });
  MaquinaInstancia.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo' });
  
}

module.exports = MaquinaInstancia;