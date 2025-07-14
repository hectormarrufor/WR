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
      comment: 'Saldo actual de la cuenta bancaria.',
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
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
