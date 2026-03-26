// models/compras/Cotizacion.js
const sequelize = require('../../../sequelize');
const { DataTypes } = require('sequelize');

const Cotizacion = sequelize.define('Cotizacion', {
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Ej: COT-PROV1-2026-001
  },
  fechaEmision: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  fechaVencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true, // Los presupuestos suelen durar 3 a 15 días
  },
  moneda: {
    type: DataTypes.ENUM('USD', 'VES', 'EUR'),
    defaultValue: 'USD',
  },
  archivoUrl: {
    type: DataTypes.STRING,
    allowNull: true, // Ruta donde se guarda el PDF o Imagen
  },
  tasaCambioReferencial: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true, // Si cotizan en Bs, a qué tasa lo calcularon
  },
  condicionesPago: {
    type: DataTypes.STRING, // Ej: "Contado", "Crédito 15 días", "50% Adelanto"
    allowNull: true,
  },
  tiempoEntregaDias: {
    type: DataTypes.INTEGER, // Factor clave para decidir si urge
    defaultValue: 1,
  },
  estado: {
    type: DataTypes.ENUM(
      'Borrador',           // Se están cargando los items
      'Recibida',           // Lista para el cuadro comparativo
      'Seleccionada Parcial',// Ganó algunos items, pero no todos
      'Seleccionada Total',  // Ganó toda la requisición
      'Rechazada'           // Perdió contra otros proveedores
    ),
    defaultValue: 'Borrador',
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true, // Ej: "El proveedor dice que no incluye flete"
  }
}, {
  tableName: 'Cotizaciones',
  timestamps: true,
});

Cotizacion.associate = (models) => {
  // Relaciones Principales
  Cotizacion.belongsTo(models.Requisicion, { foreignKey: 'requisicionId', as: 'requisicion' });
  Cotizacion.belongsTo(models.Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });
  
  // Detalle de los items cotizados
  Cotizacion.hasMany(models.CotizacionDetalle, { foreignKey: 'cotizacionId', as: 'detalles', onDelete: 'CASCADE' });
  
  // Si esta cotización genera una (o varias) Órdenes de Compra
  Cotizacion.hasMany(models.OrdenCompra, { foreignKey: 'cotizacionBaseId', as: 'ordenesGeneradas' });
};

module.exports = Cotizacion;