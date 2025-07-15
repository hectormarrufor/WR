// models/Factura.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const DetalleRecepcionCompra = sequelize.define('DetalleRecepcionCompra', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    recepcionCompraId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'RecepcionesCompra',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    consumibleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Consumibles',
            key: 'id',
        },
    },
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
    // ID de la EntradaInventario generada por este detalle
    entradaInventarioId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Puede ser null si la entrada es generada después
        references: {
            model: 'EntradasInventario',
            key: 'id',
        },
    }
}, {
    // Opciones del modelo
    tableName: 'DetallesRecepcionCompra', // Nombre de la tabla en la base de datos
    timestamps: true, // `createdAt` y `updatedAt`
});

DetalleRecepcionCompra.associate = (models) => {
    DetalleRecepcionCompra.belongsTo(models.RecepcionCompra, {
        foreignKey: 'recepcionCompraId',
        as: 'recepcionCompra',
    });
    DetalleRecepcionCompra.belongsTo(models.Consumible, {
        foreignKey: 'consumibleId',
        as: 'consumible',
    });
    // Un detalle de recepción puede generar una o varias EntradasInventario
    // Por simplicidad, una entrada por cada detalle de recepción en este caso.
};


module.exports = DetalleRecepcionCompra