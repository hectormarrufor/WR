const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Ingreso = sequelize.define('Ingreso', {
  fechaIngreso: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  
  // ==========================================
  // CONFIGURACIÓN MULTIMONEDA Y TASA
  // ==========================================
  monedaOperacion: {
    type: DataTypes.ENUM('USD', 'VES'),
    allowNull: false,
    defaultValue: 'USD',
  },
  tasaCambio: {
    type: DataTypes.DECIMAL(18, 4),
    allowNull: true,
  },
  fuenteTasa: {
    type: DataTypes.ENUM('BCV', 'Binance', 'Manual'),
    defaultValue: 'BCV'
  },

  // ==========================================
  // DESGLOSE FISCAL
  // ==========================================
  esFacturado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  montoBaseUsd: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  montoIvaUsd: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
  },
  montoIgtfUsd: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
  },
  retencionIvaUsd: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
  },
  retencionIslrUsd: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
  },
  impuestoMunicipalProvisionUsd: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
  },

  // ==========================================
  // TOTALES NETOS (Lo que entra a la cuenta)
  // ==========================================
  montoNetoUsd: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  montoNetoBs: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },

  // ==========================================
  // DATOS OPERATIVOS
  // ==========================================
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
  // Asociaciones originales de WR restauradas:
  Ingreso.belongsTo(models.Flete, { foreignKey: 'fleteId', as: 'flete', constraints: false });
  Ingreso.belongsTo(models.ODT, { foreignKey: 'odtId', as: 'odt', constraints: false });
  Ingreso.belongsTo(models.Cliente, { foreignKey: 'clienteId', as: 'cliente' });
  Ingreso.belongsTo(models.MovimientoTesoreria, { 
    foreignKey: 'movimientoTesoreriaId', 
    as: 'movimientoAsociado' 
  });
};

module.exports = Ingreso;