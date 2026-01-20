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
    origen: {
        type: DataTypes.ENUM('manual', 'odt'),
        defaultValue: 'manual',
    },
}, {
    tableName: 'Horometros',
    timestamps: true,
});

Horometro.associate = (models) => {
    Horometro.belongsTo(models.Activo, { foreignKey: 'activoId' });
    Horometro.belongsTo(models.ODT, { foreignKey: 'odtId' });
}

module.exports = Horometro;