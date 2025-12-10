// models/tesoreria/CuentaTerceros.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const CuentaTerceros = sequelize.define('CuentaTerceros', {
  nombreBanco: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  titularCuenta: {
    type: DataTypes.STRING,
    allowNull: false,
  },
    cedulaCuenta: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  numeroCuenta: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  tipoCuenta: {
    type: DataTypes.ENUM('Corriente', 'Ahorros'),
    allowNull: false,
  },
  moneda: {
    type: DataTypes.ENUM(["USD", "VES", "EUR"]), // Ej: "USD", "VES"
    allowNull: false,
    defaultValue: 'VES',
  },

}, {
  tableName: 'CuentasTerceros',
  timestamps: true,
});

CuentaTerceros.associate = (models) => {
  CuentaTerceros.belongsTo(models.Proveedor, { foreignKey: 'proveedorId' });
  CuentaTerceros.belongsTo(models.Empleado, { foreignKey: 'empleadoId' });
};

module.exports = CuentaTerceros;