// models/tesoreria/CuentaBancaria.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const CuentaBancaria = sequelize.define('CuentaBancaria', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
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
    allowNull: false,
  },
  // Nuevos campos para titular y su identificación
  titularRazonSocial: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Razón social o nombre completo del titular de la cuenta',
  },
  titularIdentificacion: {
    type: DataTypes.STRING, // Ej. V-12345678, J-12345678-9
    allowNull: false,
    comment: 'Cédula o RIF del titular de la cuenta',
  },
  pagoMovil: { // Campo para el número de teléfono de Pago Móvil
    type: DataTypes.STRING, // Almacenará el número telefónico
    allowNull: true, // Es opcional
    comment: 'Número de teléfono asociado a Pago Móvil',
  },
}, {
  tableName: 'CuentasBancarias',
  timestamps: true,
});

CuentaBancaria.associate = (models) => {
  CuentaBancaria.hasMany(models.MovimientoTesoreria, { foreignKey: 'cuentaOrigenId', as: 'movimientosOrigen' });
  CuentaBancaria.hasMany(models.MovimientoTesoreria, { foreignKey: 'cuentaDestinoId', as: 'movimientosDestino' });
};

module.exports = CuentaBancaria;