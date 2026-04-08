const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Ingreso = sequelize.define('Ingreso', {
  fechaIngreso: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  montoBs: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  montoUsd: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  tasaBcv: {
    type: DataTypes.DECIMAL(18, 4),
    allowNull: true,
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'Cobrado', 'Anulado'),
    defaultValue: 'Pendiente',
    allowNull: false,
  },
  tipoOrigen: {
    type: DataTypes.ENUM(
      'Flete',           // Cobro directo de un viaje
      'Servicio ODT',    // Reparaciones a terceros o servicios de taller
      'Venta Activo',    // Venta de chuto, remolque o repuesto usado
      'Otros'
    ),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  referenciaExterna: {
    type: DataTypes.STRING,
    allowNull: true, // Nro de factura o nro de control
  }
}, {
  tableName: 'Ingresos',
  timestamps: true,
});

Ingreso.associate = (models) => {
  // 1. Relación con Flete (Ingreso por viaje)
  Ingreso.belongsTo(models.Flete, { foreignKey: 'fleteId', as: 'flete', constraints: false });

  // 2. Relación con ODT (Ingreso por servicios de taller a terceros)
  Ingreso.belongsTo(models.ODT, { foreignKey: 'odtId', as: 'odt', constraints: false });

  // 3. Relación con el cliente (Quién paga)
  Ingreso.belongsTo(models.Cliente, { foreignKey: 'clienteId', as: 'cliente' });

  // 4. Relación con Tesorería (A qué cuenta entró el dinero)
  Ingreso.belongsTo(models.MovimientoTesoreria, { 
    foreignKey: 'movimientoTesoreriaId', 
    as: 'movimientoAsociado' 
  });
};

module.exports = Ingreso;