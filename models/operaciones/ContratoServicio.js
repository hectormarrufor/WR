// models/ContratoServicio.js
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
    comment: 'Número único del contrato de servicio.',
  },
  cliente: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nombre de la empresa cliente (Ej: PDVSA, Chevron).',
  },
  fechaInicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  fechaFinEstimada: {
    type: DataTypes.DATEONLY,
    allowNull: true, // Puede ser un contrato abierto
  },
  estado: {
    type: DataTypes.ENUM('Activo', 'Pausado', 'Finalizado', 'Cancelado'),
    defaultValue: 'Activo',
    allowNull: false,
  },
  montoEstimado: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
    comment: 'Monto total estimado del contrato.',
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descripción general del alcance del contrato.',
  },
}, {
  tableName: 'ContratosServicio',
  timestamps: true,
});

ContratoServicio.associate = (models) => {
  ContratoServicio.hasMany(models.RenglonContrato, { foreignKey: 'contratoId', as: 'renglones' });
  ContratoServicio.hasMany(models.MovimientoTesoreria, { foreignKey: 'contratoServicioId', as: 'movimientosFinancieros' }); // NUEVO
  ContratoServicio.hasMany(models.SalidaInventario, { foreignKey: 'contratoServicioId', as: 'salidasInventarioPorVenta' }); // NUEVO
};

module.exports = ContratoServicio