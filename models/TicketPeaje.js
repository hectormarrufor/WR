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
    },
    referencia: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Número de ticket o factura del peaje'
    },
    fotoTicket: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    tableName: 'TicketsPeajes',
    timestamps: true,
});

TicketPeaje.associate = (models) => {
    TicketPeaje.belongsTo(models.Peaje, { foreignKey: 'peajeId', as: 'peaje' });
    TicketPeaje.belongsTo(models.Empleado, { foreignKey: 'choferId', as: 'chofer' });
    TicketPeaje.belongsTo(models.Flete, { foreignKey: 'fleteId', as: 'flete', constraints: false });
    // Enlace directo al gasto financiero
    TicketPeaje.belongsTo(models.GastoVariable, { foreignKey: 'gastoVariableId', as: 'gasto' });
};

module.exports = TicketPeaje;