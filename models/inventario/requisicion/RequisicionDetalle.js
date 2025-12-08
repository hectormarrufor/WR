const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const RequisicionDetalle = sequelize.define('RequisicionDetalle', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    requisicionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Requisiciones', key: 'id' }
    },
    consumibleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Consumibles', key: 'id' }
    },
    cantidadSolicitada: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    }
}, { tableName: 'RequisicionDetalles', timestamps: false, underscored: true });

RequisicionDetalle.associate = (models) => {
    RequisicionDetalle.belongsTo(models.Requisicion, { foreignKey: 'requisicionId', as: 'requisicion' });
    RequisicionDetalle.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
};

module.exports = RequisicionDetalle;