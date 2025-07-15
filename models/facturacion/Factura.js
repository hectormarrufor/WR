// models/Factura.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Factura = sequelize.define('Factura', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    numeroFactura: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    // Cliente al que se le emite la factura
    clienteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Clientes', // Nombre de la tabla del modelo Cliente
            key: 'id',
        },
    },
    // Opcional: Contrato asociado a esta factura
    contratoId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Puede ser nulo si la factura no está directamente ligada a un contrato
        references: {
            model: 'ContratosServicio', // Nombre de la tabla del modelo Contrato
            key: 'id',
        },
    },
    // Opcional: Operación de Campo asociada a esta factura
    operacionCampoId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Puede ser nulo si la factura no está directamente ligada a una operación de campo
        references: {
            model: 'OperacionesCampo', // Nombre de la tabla del modelo OperacionCampo
            key: 'id',
        },
    },
    fechaEmision: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    fechaVencimiento: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    montoTotal: {
        type: DataTypes.DECIMAL(10, 2), // 10 dígitos en total, 2 decimales
        allowNull: false,
        defaultValue: 0.00,
    },
    impuestos: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    totalAPagar: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    estado: {
        type: DataTypes.STRING, // Ej. "Pendiente", "Pagada", "Vencida", "Anulada"
        allowNull: false,
        defaultValue: 'Pendiente',
    },
    notas: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    // Opciones del modelo
    tableName: 'Facturas', // Nombre de la tabla en la base de datos
    timestamps: true, // `createdAt` y `updatedAt`
});

Factura.associate = (models) => {
    Factura.belongsTo(models.Cliente, { foreignKey: 'clienteId' });
    Factura.belongsTo(models.ContratoServicio, { foreignKey: 'contratoId' });
    Factura.belongsTo(models.OperacionCampo, { foreignKey: 'operacionCampoId' });
    Factura.hasMany(models.RenglonFactura, { foreignKey: 'facturaId', as: 'renglones' });
    Factura.hasMany(models.PagoFactura, { foreignKey: 'facturaId', as: 'pagos' });
};


module.exports = Factura;