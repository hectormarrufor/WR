// models/NotaCredito.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const NotaCredito = sequelize.define('NotaCredito', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  numeroNota: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  facturaId: { // A qué factura se aplica esta nota de crédito
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Facturas', // Nombre de la tabla del modelo Factura
      key: 'id',
    },
  },
  fechaEmision: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  monto: { // El monto total de la nota de crédito (positivo)
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  motivo: {
    type: DataTypes.TEXT, // Ej. "Devolución de mercancía", "Error de facturación", "Descuento"
    allowNull: false,
  },
  estado: {
    type: DataTypes.STRING, // Ej. "Emitida", "Aplicada", "Anulada"
    allowNull: false,
    defaultValue: 'Emitida',
  },
  // Opcional: Referencia a la persona que autorizó o emitió
  emitidaPorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Empleados', // Asumiendo que tienes un modelo Empleado
      key: 'id',
    },
  },
}, {
  tableName: 'NotasCredito',
  timestamps: true,
});

NotaCredito.associate = (models) => {
  NotaCredito.belongsTo(models.Factura, { foreignKey: 'facturaId', as: 'factura' });
  NotaCredito.belongsTo(models.Empleado, { foreignKey: 'emitidaPorId', as: 'emitidaPor' });
};

module.exports = NotaCredito;