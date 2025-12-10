// models/inventario/OrdenCompraItem.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');
const OrdenCompraItem = sequelize.define('OrdenCompraItem', {
  cantidadSolicitada: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false,
  },
  precioUnitario: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
}, {
  tableName: 'DetallesOrdenCompra',
  timestamps: true,
});

OrdenCompraItem.associate = (models) => {
  OrdenCompraItem.belongsTo(models.OrdenCompra, { foreignKey: 'ordenCompraId', as: 'ordenCompra' });
  OrdenCompraItem.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
};

module.exports = OrdenCompraItem;
