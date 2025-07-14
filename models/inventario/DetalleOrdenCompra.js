// models/inventario/DetalleOrdenCompra.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');
  const DetalleOrdenCompra = sequelize.define('DetalleOrdenCompra', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ordenCompraId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'OrdenesCompra',
        key: 'id',
      },
      allowNull: false,
    },
    consumibleId: { // El ítem que se está comprando
      type: DataTypes.INTEGER,
      references: {
        model: 'Consumibles',
        key: 'id',
      },
      allowNull: false,
    },
    cantidadSolicitada: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: false,
    },
    cantidadRecibida: {
      type: DataTypes.DECIMAL(15, 3),
      defaultValue: 0,
      allowNull: false,
    },
    precioUnitario: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'DetallesOrdenCompra',
    timestamps: true,
  });

  DetalleOrdenCompra.associate = (models) => {
    DetalleOrdenCompra.belongsTo(models.OrdenCompra, { foreignKey: 'ordenCompraId', as: 'ordenCompra' });
    DetalleOrdenCompra.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
  };

  module.exports = DetalleOrdenCompra;
