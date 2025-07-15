// models/inventario/EntradaInventario.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');
const EntradaInventario = sequelize.define('EntradaInventario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  consumibleId: { // El ítem que entra
    type: DataTypes.INTEGER,
    references: {
      model: 'Consumibles',
      key: 'id',
    },
    allowNull: false,
  },
  cantidad: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false,
  },
  fechaEntrada: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  tipoEntrada: {
    type: DataTypes.ENUM('Compra', 'Devolución', 'Ajuste Positivo', 'Transferencia'),
    allowNull: false,
  },
  ordenCompraId: { // Opcional: si la entrada proviene de una Orden de Compra
    type: DataTypes.INTEGER,
    references: {
      model: 'OrdenesCompra',
      key: 'id',
    },
    allowNull: true,
  },
  documentoReferencia: { // Nro de factura, nota de entrega, etc.
    type: DataTypes.STRING,
    allowNull: true,
  },
  recibidoPorId: { // Quién recibió la entrada
    type: DataTypes.INTEGER,
    references: {
      model: 'Empleados',
      key: 'id',
    },
    allowNull: true,
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Nuevo campo: Referencia al detalle de recepción de compra si aplica
  detalleRecepcionCompraId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Puede ser null si la entrada no proviene de una recepción de compra
    references: {
      model: 'DetallesRecepcionCompra',
      key: 'id',
    },
  },
  tipoEntrada: { // Ampliar los tipos de entrada si es necesario
    type: DataTypes.ENUM('Compra', 'Ajuste', 'DevolucionCliente', 'Produccion', 'Otro'),
    allowNull: false,
    defaultValue: 'Compra', // 'Compra' para las recepciones
  },
}, {
  tableName: 'EntradasInventario',
  timestamps: true,
});

EntradaInventario.associate = (models) => {
  EntradaInventario.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
  EntradaInventario.belongsTo(models.OrdenCompra, { foreignKey: 'ordenCompraId', as: 'ordenCompra' });
  EntradaInventario.belongsTo(models.Empleado, { foreignKey: 'recibidoPorId', as: 'recibidoPor' });
  EntradaInventario.belongsTo(models.DetalleRecepcionCompra, {
    foreignKey: 'detalleRecepcionCompraId', // Nueva FK
    as: 'detalleRecepcionCompra',
  });
};

module.exports = EntradaInventario;
