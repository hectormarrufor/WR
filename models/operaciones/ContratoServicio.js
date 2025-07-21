const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const ContratoServicio = sequelize.define('ContratoServicio', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  numeroContrato: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  clienteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Clientes',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  fechaInicio: { // Fecha de inicio de operaciones del contrato
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  fechaFinEstimada: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  estado: {
    type: DataTypes.ENUM('Activo', 'Pausado', 'Finalizado', 'Cancelado', 'Pendiente'),
    defaultValue: 'Pendiente', // Cambiado a Pendiente como estado inicial lógico
    allowNull: false,
  },
  monedaContrato: { // Moneda principal en la que se firmó el contrato
    type: DataTypes.ENUM('USD', 'VES'),
    allowNull: false,
    defaultValue: 'USD',
  },
  montoEstimado: { // Este se mantiene para referencia, pero los nuevos serán específicos
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false, // Ahora es requerido si tienes montos específicos
    defaultValue: 0.00,
  },
  // --- NUEVOS CAMPOS ---
  fechaFirmaContrato: { // Nueva: Fecha en que se firmó el contrato
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  tasaCambioUSDVES: { // Nueva: Tasa de cambio USD/VES en la fecha de firma
    type: DataTypes.DECIMAL(18, 2), // Puedes ajustar la precisión si las tasas tienen muchos decimales
    allowNull: true, // Puede ser null si el contrato es en USD puro y no requiere conversión
  },
  montoEstimadoUSD: { // Nuevo: Monto del contrato en USD
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  montoEstimadoVES: { // Nuevo: Monto del contrato en VES
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  // --- FIN NUEVOS CAMPOS ---
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tipoPagoContrato: { // Nuevo: 'total' o 'plan_pagos'
    type: DataTypes.ENUM('total', 'plan_pagos'),
    defaultValue: 'plan_pagos',
    allowNull: false,
  }
}, {
  tableName: 'ContratosServicio',
  timestamps: true,
});

ContratoServicio.associate = (models) => {
  ContratoServicio.belongsTo(models.Cliente, {
    foreignKey: 'clienteId',
    as: 'cliente',
  });
  ContratoServicio.hasMany(models.RenglonContrato, { foreignKey: 'contratoId', as: 'renglones' });
  ContratoServicio.hasMany(models.Factura, { foreignKey: 'contratoId' });
  ContratoServicio.hasMany(models.MovimientoTesoreria, { foreignKey: 'contratoServicioId', as: 'movimientosFinancieros' });
  ContratoServicio.hasMany(models.SalidaInventario, { foreignKey: 'contratoServicioId', as: 'salidasInventarioPorVenta' });
};

module.exports = ContratoServicio;