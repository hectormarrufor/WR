// models/Factura.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const PagoProveedor = sequelize.define('PagoProveedor', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    facturaProveedorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'FacturasProveedor',
            key: 'id',
        },
        onDelete: 'CASCADE',
    },
    monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    fechaPago: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    metodoPago: {
        type: DataTypes.ENUM('Transferencia', 'Cheque', 'Efectivo', 'Otro'),
        allowNull: false,
    },
    referenciaPago: { // Número de transacción, cheque, etc.
        type: DataTypes.STRING,
        allowNull: true,
    },
    cuentaBancariaId: { // Cuenta desde la que se paga
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'CuentasBancarias', // Asegúrate de que el nombre de la tabla de tu modelo CuentaBancaria sea correcto
            key: 'id',
        },
    },
    registradoPorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Empleados',
            key: 'id',
        },
    },
    notas: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    movimientoTesoreriaId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'MovimientosTesoreria',
            key: 'id',
        }
    }
}, {
    // Opciones del modelo
    tableName: 'PagosProveedor', // Nombre de la tabla en la base de datos
    timestamps: true, // `createdAt` y `updatedAt`
});

PagoProveedor.associate = (models) => {
    PagoProveedor.belongsTo(models.FacturaProveedor, {
        foreignKey: 'facturaProveedorId',
        as: 'facturaProveedor',
    });
    PagoProveedor.belongsTo(models.CuentaBancaria, {
        foreignKey: 'cuentaBancariaId',
        as: 'cuentaBancaria', // Desde dónde se realiza el pago
    });
    PagoProveedor.belongsTo(models.Empleado, {
        foreignKey: 'registradoPorId',
        as: 'registradoPor',
    });
    PagoProveedor.belongsTo(models.MovimientoTesoreria, { // Si cada pago genera un movimiento
        foreignKey: 'movimientoTesoreriaId',
        as: 'movimientoTesoreria',
        allowNull: true, // Puede ser null si el movimiento se registra por separado
    });
};


module.exports = PagoProveedor;