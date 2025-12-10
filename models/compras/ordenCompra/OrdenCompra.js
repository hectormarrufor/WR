// models/inventario/OrdenCompra.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');
const OrdenCompra = sequelize.define('OrdenCompra', {
  numeroOrden: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
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
  montoTotalEstimado: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  montoTotalReal: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  justificacion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'OrdenesCompra',
  timestamps: true,
});

OrdenCompra.associate = (models) => {
  OrdenCompra.belongsTo(models.Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });
  OrdenCompra.hasMany(models.OrdenCompraItem, { foreignKey: 'ordenCompraId', as: 'items', onDelete: 'CASCADE', });
  OrdenCompra.hasMany(models.RecepcionCompra, {
    foreignKey: 'ordenCompraId',
    as: 'recepciones',
  });
};

module.exports = OrdenCompra;
