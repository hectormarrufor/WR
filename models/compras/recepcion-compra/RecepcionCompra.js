// models/Factura.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const RecepcionCompra = sequelize.define('RecepcionCompra', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    ordenCompraId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'OrdenesCompra',
            key: 'id',
        },
    },
    fechaRecepcion: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    numeroGuia: { // Número de guía del proveedor o remisión
        type: DataTypes.STRING,
        allowNull: true,
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
    RecepcionCompra.hasMany(models.DetalleRecepcionCompra, {
        foreignKey: 'recepcionCompraId',
        as: 'detalles',
        onDelete: 'CASCADE', // Si se elimina la recepción, se eliminan sus detalles
    });
};


module.exports = RecepcionCompra