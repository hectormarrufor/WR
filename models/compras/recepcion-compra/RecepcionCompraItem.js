// models/Factura.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const RecepcionCompraItem = sequelize.define('RecepcionCompraItem', {
    cantidadRecibida: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    precioUnitarioActual: { // Precio en el momento de la recepción (puede diferir de OC)
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    notas: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    // Opciones del modelo
    tableName: 'RecepcionCompraItems', // Nombre de la tabla en la base de datos
    timestamps: true, // `createdAt` y `updatedAt`
});

RecepcionCompraItem.associate = (models) => {
    RecepcionCompraItem.belongsTo(models.RecepcionCompra, {
        foreignKey: 'recepcionCompraId',
        as: 'recepcionCompra',
    });
    RecepcionCompraItem.belongsTo(models.Consumible, {
        foreignKey: 'consumibleId',
        as: 'consumible',
    });
    RecepcionCompraItem.belongsTo(models.EntradaInventario, { foreignKey: 'entradaInventarioId' });

};


module.exports = RecepcionCompraItem