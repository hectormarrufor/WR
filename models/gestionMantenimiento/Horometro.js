const { DataTypes } = require('sequelize');
const Activo = require('./Activo.js');
const sequelize = require('../../sequelize.js');

const Horometro = sequelize.define('Horometro', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    fecha_registro: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    valor: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
}, {
    tableName: 'horometros',
    timestamps: true,
});

Horometro.belongsTo(Activo, { foreignKey: 'activoId' });
Activo.hasMany(Horometro, { foreignKey: 'activoId', as: 'historial_horometros' });

module.exports = Horometro;