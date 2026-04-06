const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Peaje = sequelize.define('Peaje', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    latitud: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Para futura integración con Google Maps'
    },
    longitud: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Para futura integración con Google Maps'
    },
    estado: {
        type: DataTypes.ENUM('Activo', 'Inactivo'),
        defaultValue: 'Activo',
        allowNull: false
    }
}, {
    tableName: 'Peajes',
    timestamps: true,
});

Peaje.associate = (models) => {
    Peaje.hasMany(models.TicketPeaje, { foreignKey: 'peajeId', as: 'tickets' });
};

module.exports = Peaje;