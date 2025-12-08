// models/inventario/OrdenCompra.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');
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
    type: DataTypes.ENUM(
      'Pendiente',
      'Aprobada',
      'Rechazada',
      'Enviada',
      'Recibida Parcial', // Nuevo estado
      'Recibida Completa', // Nuevo estado
      'Cancelada'
    ),
    allowNull: false,
    defaultValue: 'Pendiente',
  },
  // Añadir campo para rastrear total recibido (opcional, se puede calcular)
  totalRecibido: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  facturada: { // Ahora sí tiene sentido este campo
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  montoFacturado: { // Nuevo campo para llevar el control de lo facturado
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  montoTotalEstimado: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  montoTotalReal: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
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
  OrdenCompra.hasMany(models.DetalleOrdenCompra, { foreignKey: 'ordenCompraId', as: 'detalles', onDelete: 'CASCADE', });
  OrdenCompra.hasMany(models.EntradaInventario, { foreignKey: 'ordenCompraId', as: 'entradasInventario' }); // Una OC puede tener varias entradas (ej. parciales)
  OrdenCompra.hasMany(models.RecepcionCompra, {
    foreignKey: 'ordenCompraId',
    as: 'recepciones',
  });
  // NUEVA ASOCIACIÓN: Una OC puede tener muchas facturas de proveedor
  OrdenCompra.hasMany(models.FacturaProveedor, {
    foreignKey: 'ordenCompraId',
    as: 'facturasProveedor',
  });
};

module.exports = OrdenCompra;
