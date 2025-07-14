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
      comment: 'Tipo de movimiento de entrada.',
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
      comment: 'Número de factura, guía de despacho o documento de soporte.',
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
  }, {
    tableName: 'EntradasInventario',
    timestamps: true,
  });

  EntradaInventario.associate = (models) => {
    EntradaInventario.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
    EntradaInventario.belongsTo(models.OrdenCompra, { foreignKey: 'ordenCompraId', as: 'ordenCompra' });
    EntradaInventario.belongsTo(models.Empleado, { foreignKey: 'recibidoPorId', as: 'recibidoPor' });
  };

  module.exports = EntradaInventario;
