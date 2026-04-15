const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const GastoVariable = sequelize.define('GastoVariable', {
  fechaGasto: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  
  // ==========================================
  // CONFIGURACIÓN MULTIMONEDA
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
  // DESGLOSE FISCAL (Si somos Contribuyentes Especiales)
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
  retencionIvaUsd: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
    comment: 'Pasivo a pagar al SENIAT'
  },
  retencionIslrUsd: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0,
    comment: 'Pasivo a pagar al SENIAT'
  },

  // ==========================================
  // TOTALES NETOS (Lo que sale de la cuenta)
  // ==========================================
  montoPagadoUsd: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  montoPagadoBs: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },

  // ==========================================
  // DATOS OPERATIVOS
  // ==========================================
  estado: {
    type: DataTypes.ENUM('Pendiente', 'Pagado', 'Anulado'),
    defaultValue: 'Pendiente', 
    allowNull: false,
  },
  tipoOrigen: {
    type: DataTypes.ENUM(
      'Nomina',           // Relacionado a Empleado
      'Compra Repuestos', // Relacionado a OrdenCompra
      'Servicio Externo', // Mantenimientos en talleres externos
      'Combustible',      // Vital para transporte
      'Viaticos',         // Dinero para el chofer en ruta
      'Impuestos', 
      'Gastos Adm',       // Papelería, oficina
      'Otros',
      'Peajes'            // Peajes en rutas
    ),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  referenciaExterna: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'GastosVariables',
  timestamps: true,
});

GastoVariable.associate = (models) => {
  // Asociaciones originales de WR restauradas:
  GastoVariable.belongsTo(models.Empleado, { foreignKey: 'empleadoId', as: 'empleado' });
  GastoVariable.belongsTo(models.OrdenCompra, { foreignKey: 'ordenCompraId', as: 'ordenCompra' });
  GastoVariable.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo' });
  GastoVariable.belongsTo(models.Proveedor, { foreignKey: 'proveedorId', as: 'proveedor' });
  GastoVariable.belongsTo(models.Flete, { foreignKey: 'fleteId', as: 'flete', constraints: false });
  GastoVariable.belongsTo(models.MovimientoTesoreria, { 
    foreignKey: 'movimientoTesoreriaId', 
    as: 'pagoAsociado' 
  });
};

module.exports = GastoVariable;