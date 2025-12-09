// models/tesoreria/CuentaBancaria.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const CuentaBancaria = sequelize.define('CuentaBancaria', {
  nombreBanco: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  numeroCuenta: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  tipoCuenta: {
    type: DataTypes.ENUM('Corriente', 'Ahorros', 'Dólares', 'Euros'),
    allowNull: false,
  },
  moneda: {
    type: DataTypes.STRING, // Ej: "USD", "VES"
    allowNull: false,
    defaultValue: 'USD',
  },
  saldoActual: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
    allowNull: true,
  },
  pagoMovil: { // Campo para el número de teléfono de Pago Móvil
    type: DataTypes.STRING, // Almacenará el número telefónico
    allowNull: true, // Es opcional
    comment: 'Número de teléfono asociado a Pago Móvil',
  },
  cedulaPagoMovil: { // Cédula del titular para Pago Móvil
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Cédula del titular asociada a Pago Móvil',
  },
}, {
  tableName: 'CuentasBancarias',
  timestamps: true,
});

CuentaBancaria.associate = (models) => {
  CuentaBancaria.hasMany(models.MovimientoTesoreria, { foreignKey: 'cuentaOrigenId', as: 'movimientosOrigen' });
  CuentaBancaria.hasMany(models.MovimientoTesoreria, { foreignKey: 'cuentaDestinoId', as: 'movimientosDestino' });
  CuentaBancaria.belongsTo(models.Proveedor, { foreignKey: 'proveedorId' });
  CuentaBancaria.belongsTo(models.Empleado, { foreignKey: 'empleadoId' });
};

module.exports = CuentaBancaria;