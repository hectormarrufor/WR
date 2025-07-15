// models/Factura.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const FacturaProveedor = sequelize.define('FacturaProveedor', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    proveedorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Proveedores',
        key: 'id',
      },
    },
    ordenCompraId: { // Referencia a la OC, si aplica
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'OrdenesCompra',
        key: 'id',
      },
    },
    numeroFactura: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // El número de factura debe ser único por proveedor (o globalmente)
    },
    fechaEmision: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    fechaVencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    montoTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    impuestos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    totalAPagar: { // Suma de subtotal + impuestos
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    montoPagado: { // Cuánto se ha pagado de esta factura
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    estado: { // Pendiente, Pagada, Parcialmente Pagada, Anulada
      type: DataTypes.ENUM('Pendiente', 'Pagada', 'Parcialmente Pagada', 'Anulada'),
      allowNull: false,
      defaultValue: 'Pendiente',
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fechaRecepcionFactura: { // Fecha en que la factura fue recibida por la empresa
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    // Opciones del modelo
    tableName: 'FacturasProveedor', // Nombre de la tabla en la base de datos
    timestamps: true, // `createdAt` y `updatedAt`
});

FacturaProveedor.associate = (models) => {
    FacturaProveedor.belongsTo(models.Proveedor, {
        foreignKey: 'proveedorId',
        as: 'proveedor',
      });
      FacturaProveedor.belongsTo(models.OrdenCompra, { // Opcional, si la factura es por una OC completa
        foreignKey: 'ordenCompraId',
        as: 'ordenCompra',
        allowNull: true,
      });
      FacturaProveedor.hasMany(models.DetalleFacturaProveedor, {
        foreignKey: 'facturaProveedorId',
        as: 'detalles',
        onDelete: 'CASCADE',
      });
      FacturaProveedor.hasMany(models.PagoProveedor, { // Asociación con los pagos de esta factura
        foreignKey: 'facturaProveedorId',
        as: 'pagos',
        onDelete: 'SET NULL', // Los pagos pueden existir independientemente si la factura se anula
      });
      // Asociación con MovimientosTesoreria para pagos de esta factura
      // Esto se puede manejar en el modelo MovimientoTesoreria si ya tiene facturaProveedorId
};


module.exports = FacturaProveedor;