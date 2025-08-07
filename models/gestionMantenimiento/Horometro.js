const { DataTypes } = require('sequelize');
const Activo = require('./Activo.js');
const sequelize = require('../../sequelize.js');

const Horometro = sequelize.define('Horometro', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    activoId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Activos', key: 'id' }
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
    tableName: 'Horometros',
    timestamps: true,
});

Horometro.belongsTo(Activo, { foreignKey: 'activoId' });

module.exports = Horometro;