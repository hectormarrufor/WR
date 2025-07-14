const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const ConsumibleUsado = sequelize.define('ConsumibleUsado', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    cantidad: {
      type: DataTypes.FLOAT, // Puede ser decimal (ej: 4.5 litros)
      allowNull: false,
    },
    costoIndividual: { // Costo al momento de la compra/uso
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    tareaMantenimientoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'TareaMantenimientos',
        key: 'id',
      },
      allowNull: false,
    },
    consumibleId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Consumibles',
        key: 'id',
      },
      allowNull: false,
    },
  });

  ConsumibleUsado.associate = (models) => {
    ConsumibleUsado.belongsTo(models.TareaMantenimiento, { foreignKey: 'tareaMantenimientoId', as: 'tareaMantenimiento' });
    ConsumibleUsado.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
  };

  module.exports = ConsumibleUsado