const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const ConsumibleRecomendado = sequelize.define('ConsumibleRecomendado', {
  cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  tipo: { 
    type: DataTypes.ENUM('fungible','serializado'),
    allowNull: false
  }
}, {
  tableName: 'ConsumiblesRecomendados'
});

ConsumibleRecomendado.associate = (models) => {
  ConsumibleRecomendado.belongsTo(models.Subsistema, { foreignKey: 'subsistemaId', as: 'subsistema' });
  ConsumibleRecomendado.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
}
module.exports = ConsumibleRecomendado;