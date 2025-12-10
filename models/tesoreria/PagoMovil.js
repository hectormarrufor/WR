// models/tesoreria/PagoMovil.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const PagoMovil = sequelize.define('PagoMovil', {
    nombreBanco: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    titularCuenta: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    cedulaCuenta: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    numeroPagoMovil: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
}, {
    tableName: 'PagosMovil',
    timestamps: true,
});

PagoMovil.associate = (models) => {
    PagoMovil.belongsTo(models.Proveedor, { foreignKey: 'proveedorId' });
    PagoMovil.belongsTo(models.Empleado, { foreignKey: 'empleadoId' });
};

module.exports = PagoMovil;