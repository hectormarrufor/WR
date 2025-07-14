// models/inventario/OrdenCompra.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');
  const OrdenCompra = sequelize.define('OrdenCompra', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    numeroOrden: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Número único de la orden de compra.',
    },
    proveedorId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Proveedores',
        key: 'id',
      },
      allowNull: false,
    },
    fechaOrden: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    fechaRecepcionEstimada: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fechaRecepcionReal: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM('Pendiente', 'Enviada', 'Recibida Parcial', 'Recibida Completa', 'Cancelada'),
      defaultValue: 'Pendiente',
      allowNull: false,
    },
    montoTotalEstimado: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      comment: 'Monto total estimado de la orden de compra.',
    },
    montoTotalReal: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      comment: 'Monto total real facturado por la orden de compra.',
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'OrdenesCompra',
    timestamps: true,
  });

  OrdenCompra.associate = (models) => {
    OrdenCompra.belongsTo(models.Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });
    OrdenCompra.hasMany(models.DetalleOrdenCompra, { foreignKey: 'ordenCompraId', as: 'detalles' });
    OrdenCompra.hasMany(models.EntradaInventario, { foreignKey: 'ordenCompraId', as: 'entradasInventario' }); // Una OC puede tener varias entradas (ej. parciales)
  };

  module.exports = OrdenCompra;
