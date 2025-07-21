// models/tesoreria/MovimientoTesoreria.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const MovimientoTesoreria = sequelize.define('MovimientoTesoreria', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  fechaMovimiento: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  monto: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
  },
  moneda: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'USD',
  },
  // Definiciones unificadas y corregidas
  tipoMovimiento: {
    type: DataTypes.ENUM('Ingreso', 'Egreso', 'Transferencia'),
    allowNull: false,
  },
  categoria: {
    type: DataTypes.ENUM(
      'Venta Servicio', 'Venta Inventario', 'Reembolso', 'Préstamo Recibido', 'Otro Ingreso',
      'Compra Inventario', 'Pago Salario', 'Servicio Contratado', 'Alquiler', 'Combustible', 'Mantenimiento Externo', 'Impuesto', 'Otro Egreso',
      'Transferencia Interna'
    ),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  cuentaOrigenId: { // Para egresos y transferencias
    type: DataTypes.INTEGER,
    references: {
      model: 'CuentasBancarias',
      key: 'id',
    },
    allowNull: true,
  },
  cuentaDestinoId: { // Para ingresos y transferencias
    type: DataTypes.INTEGER,
    references: {
      model: 'CuentasBancarias',
      key: 'id',
    },
    allowNull: true,
  },
  // Referencias a otros modelos que originaron el movimiento
  ordenCompraId: { // Si es un egreso por compra
    type: DataTypes.INTEGER,
    references: {
      model: 'OrdenesCompra',
      key: 'id',
    },
    allowNull: true,
  },
  contratoServicioId: { // Si es un ingreso por venta de servicio
    type: DataTypes.INTEGER,
    references: {
      model: 'ContratosServicio',
      key: 'id',
    },
    allowNull: true,
  },
  empleadoId: { // Si es un egreso por pago de salario
    type: DataTypes.INTEGER,
    references: {
      model: 'Empleados',
      key: 'id',
    },
    allowNull: true,
  },
  documentoReferencia: { // Número de factura, recibo, etc.
    type: DataTypes.STRING,
    allowNull: true,
  },
  pagoProveedorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'PagosProveedor',
      key: 'id',
    },
  },
  facturaClienteId: { // Referencia a la factura del cliente si aplica
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Facturas',
      key: 'id',
    }
  },
}, {
  tableName: 'MovimientosTesoreria',
  timestamps: true,
});

MovimientoTesoreria.associate = (models) => {
  MovimientoTesoreria.belongsTo(models.CuentaBancaria, { foreignKey: 'cuentaOrigenId', as: 'cuentaOrigen' });
  MovimientoTesoreria.belongsTo(models.CuentaBancaria, { foreignKey: 'cuentaDestinoId', as: 'cuentaDestino' });
  MovimientoTesoreria.belongsTo(models.OrdenCompra, { foreignKey: 'ordenCompraId', as: 'ordenCompra' });
  MovimientoTesoreria.belongsTo(models.ContratoServicio, { foreignKey: 'contratoServicioId', as: 'contratoServicio' });
  MovimientoTesoreria.belongsTo(models.Empleado, { foreignKey: 'empleadoId', as: 'empleado' });
  MovimientoTesoreria.belongsTo(models.PagoProveedor, {
    foreignKey: 'pagoProveedorId',
    as: 'pagoProveedor',
    allowNull: true,
  });
  MovimientoTesoreria.belongsTo(models.Factura, { foreignKey: 'facturaClienteId', as: 'facturaCliente' }); // Nueva asociación
};

module.exports = MovimientoTesoreria;