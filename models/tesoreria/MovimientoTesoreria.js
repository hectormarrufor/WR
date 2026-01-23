// models/tesoreria/MovimientoTesoreria.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const MovimientoTesoreria = sequelize.define('MovimientoTesoreria', {
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
}, {
  tableName: 'MovimientosTesoreria',
  timestamps: true,
});

MovimientoTesoreria.associate = (models) => {
  MovimientoTesoreria.belongsTo(models.CuentaBancaria, { foreignKey: 'cuentaOrigenId', as: 'cuentaOrigen' });
  MovimientoTesoreria.belongsTo(models.CuentaBancaria, { foreignKey: 'cuentaDestinoId', as: 'cuentaDestino' });
  MovimientoTesoreria.belongsTo(models.GastoVariable, { 
    foreignKey: 'movimientoTesoreriaId', 
    as: 'gastoVariablePagado' 
  });
  MovimientoTesoreria.belongsTo(models.GastoFijo, { foreignKey: 'gastoFijoId', as: 'gastoFijoPagado' });

};

module.exports = MovimientoTesoreria;