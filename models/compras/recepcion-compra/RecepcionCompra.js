// models/Factura.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const RecepcionCompra = sequelize.define('RecepcionCompra', {
    ordenCompraId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'OrdenesCompra',
            key: 'id',
        },
    },
    nroFactura: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    fechaRecepcion: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    recibidaPorId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Empleado que realizó la recepción
        references: {
            model: 'Empleados',
            key: 'id',
        },
    },
    notas: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    estadoRecepcion: { // Puede ser 'Parcial', 'Completa'
        type: DataTypes.ENUM('Parcial', 'Completa'),
        allowNull: false,
        defaultValue: 'Parcial', // La mayoría empiezan como parciales hasta que se recibe todo
    },
}, {
    // Opciones del modelo
    tableName: 'RecepcionesCompra', // Nombre de la tabla en la base de datos
    timestamps: true, // `createdAt` y `updatedAt`
});

RecepcionCompra.associate = (models) => {
    RecepcionCompra.belongsTo(models.OrdenCompra, {
        foreignKey: 'ordenCompraId',
        as: 'ordenCompra',
    });
    RecepcionCompra.belongsTo(models.Empleado, {
        foreignKey: 'recibidaPorId',
        as: 'recibidaPor',
    });
    RecepcionCompra.hasMany(models.RecepcionCompraItem, {
        foreignKey: 'recepcionCompraId',
        as: 'detalles',
        onDelete: 'CASCADE', // Si se elimina la recepción, se eliminan sus detalles
    });
    RecepcionCompra.belongsTo(models.Proveedor, { foreignKey: 'proveedorId' });

};


module.exports = RecepcionCompra