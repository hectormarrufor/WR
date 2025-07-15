// models/Factura.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const DetalleFacturaProveedor = sequelize.define('DetalleFacturaProveedor', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    facturaProveedorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'FacturasProveedor',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    consumibleId: { // El ítem que se está facturando
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Consumibles',
        key: 'id',
      },
    },
    cantidadFacturada: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    precioUnitarioFacturado: { // Precio unitario en la factura del proveedor
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    impuestos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    detalleOrdenCompraId: { // Referencia al detalle de OC si es para una OC
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'DetallesOrdenCompra',
            key: 'id',
        },
    },
    detalleRecepcionCompraId: { // Referencia al detalle de Recepción si es para una Recepción
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'DetallesRecepcionCompra',
            key: 'id',
        },
    },
    notas: {
      type: DataTypes.STRING,
      allowNull: true,
    },
}, {
    // Opciones del modelo
    tableName: 'DetallesFacturaProveedor', // Nombre de la tabla en la base de datos
    timestamps: true, // `createdAt` y `updatedAt`
});

DetalleFacturaProveedor.associate = (models) => {
    DetalleFacturaProveedor.belongsTo(models.FacturaProveedor, {
        foreignKey: 'facturaProveedorId',
        as: 'facturaProveedor',
      });
      DetalleFacturaProveedor.belongsTo(models.Consumible, {
        foreignKey: 'consumibleId',
        as: 'consumible',
      });
      // Puedes enlazarlo a un DetalleOrdenCompra o DetalleRecepcionCompra
      // Un detalle de factura puede corresponder a un detalle de recepción específico
      DetalleFacturaProveedor.belongsTo(models.DetalleOrdenCompra, {
        foreignKey: 'detalleOrdenCompraId',
        as: 'detalleOrdenCompra',
        allowNull: true,
      });
      DetalleFacturaProveedor.belongsTo(models.DetalleRecepcionCompra, {
        foreignKey: 'detalleRecepcionCompraId',
        as: 'detalleRecepcionCompra',
        allowNull: true,
      });
};


module.exports = DetalleFacturaProveedor;