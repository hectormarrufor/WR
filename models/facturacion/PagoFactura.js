// models/PagoFactura.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const PagoFactura = sequelize.define('PagoFactura', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  facturaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Facturas', // Nombre de la tabla del modelo Factura
      key: 'id',
    },
  },
  fechaPago: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  metodoPago: {
    type: DataTypes.STRING, // Ej. "Transferencia Bancaria", "Efectivo", "Cheque", "Tarjeta de Crédito"
    allowNull: false,
  },
  referencia: {
    type: DataTypes.STRING, // Ej. Número de transferencia, número de cheque
    allowNull: true,
  },
}, {
  tableName: 'PagoFacturas',
  timestamps: true,
});

PagoFactura.associate = (models) => {
    PagoFactura.belongsTo(models.Factura, { foreignKey: 'facturaId' });
};

module.exports = PagoFactura;