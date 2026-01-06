const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const ConsumibleRecomendado = sequelize.define('ConsumibleRecomendado', {
  cantidad: {  // Cantidad recomendada para el subsistema
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: false,
    defaultValue: 1,
  },
  categoria: {  // Ej: filtro de aceite, neumatico, aceite, bateria...
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipo: { 
    type: DataTypes.ENUM('fungible','serializado'),
    allowNull: false
  },
  tipoCriterio: {
    type: DataTypes.ENUM('grupo', 'tecnico', 'individual'),
    allowNull: false,
    defaultValue: 'individual'
  },
  
  // Aquí guardamos el valor texto: "295/80R22.5", "Gr. 24F", "15W40"
  valorCriterio: {
    type: DataTypes.STRING,
    allowNull: true 
  },
}, {
  tableName: 'ConsumiblesRecomendados'
});

ConsumibleRecomendado.associate = (models) => {
  ConsumibleRecomendado.belongsTo(models.Subsistema, { foreignKey: 'subsistemaId', as: 'subsistema' });
  ConsumibleRecomendado.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
  ConsumibleRecomendado.belongsTo(models.GrupoEquivalencia, { foreignKey: 'grupoEquivalenciaId', as: 'grupoEquivalencia' });
}
module.exports = ConsumibleRecomendado;