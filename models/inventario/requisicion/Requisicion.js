const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const Requisicion = sequelize.define('Requisicion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    estado: {
        type: DataTypes.ENUM('Pendiente', 'Aprobada', 'Rechazada', 'Entregada Parcial', 'Entregada Completa'),
        defaultValue: 'Pendiente',
    },
    notas: {
        type: DataTypes.TEXT,
    }
}, { tableName: 'Requisiciones', timestamps: true, underscored: true });

Requisicion.associate = (models) => {
    Requisicion.belongsTo(models.Mantenimiento, { foreignKey: 'ordenMantenimientoId', as: 'ordenMantenimiento' });
    Requisicion.belongsTo(models.User, { foreignKey: 'solicitadoPorId', as: 'solicitante' });
    Requisicion.hasMany(models.RequisicionDetalle, { foreignKey: 'requisicionId', as: 'detalles' });
};

module.exports = Requisicion;