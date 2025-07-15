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
  // --- CAMBIO AQUÍ: Reemplazamos 'cliente' por 'clienteId' ---
  clienteId: { // Nueva clave foránea
    type: DataTypes.INTEGER,
    allowNull: false, // Un contrato siempre debe tener un cliente
    references: {
      model: 'Clientes', // Nombre de la tabla a la que hace referencia
      key: 'id',
    },
    onUpdate: 'CASCADE', // Si el ID del cliente cambia, actualiza aquí
    onDelete: 'RESTRICT', // No permitir borrar un cliente si tiene contratos
  },
  // --- FIN DEL CAMBIO ---
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
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'ContratosServicio',
  timestamps: true,
});

ContratoServicio.associate = (models) => {
  ContratoServicio.belongsTo(models.Cliente, {
    foreignKey: 'clienteId',
    as: 'cliente', // Alias para acceder al cliente desde el contrato (contrato.cliente)
  });
  ContratoServicio.hasMany(models.RenglonContrato, { foreignKey: 'contratoId', as: 'renglones' });
  ContratoServicio.hasMany(models.Factura, { foreignKey: 'contratoId' });
  ContratoServicio.hasMany(models.MovimientoTesoreria, { foreignKey: 'contratoServicioId', as: 'movimientosFinancieros' });
  ContratoServicio.hasMany(models.SalidaInventario, { foreignKey: 'contratoServicioId', as: 'salidasInventarioPorVenta' });
};

module.exports = ContratoServicio;