const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const TicketPeaje = sequelize.define('TicketPeaje', {
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    monto: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        comment: 'Monto en Bolívares (BS)'
    },
    // --- NUEVAS COLUMNAS PARA TRAZABILIDAD ---
    tasaBcv: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
        defaultValue: 1,
    },
    montoUsd: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Monto convertido a USD al momento del registro'
    },
    // -----------------------------------------
    referencia: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    hora: {
        type: DataTypes.TIME,
    },
    ejes: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    
}, {
    tableName: 'TicketsPeajes',
    timestamps: true,
});

TicketPeaje.associate = (models) => {
    TicketPeaje.belongsTo(models.Peaje, { foreignKey: 'peajeId', as: 'peaje' });
    TicketPeaje.belongsTo(models.Empleado, { foreignKey: 'choferId', as: 'chofer' });
    TicketPeaje.belongsTo(models.Flete, { foreignKey: 'fleteId', as: 'flete', constraints: false });
    TicketPeaje.belongsTo(models.GastoVariable, { foreignKey: 'gastoVariableId', as: 'gasto' });
};

module.exports = TicketPeaje;