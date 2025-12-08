const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');
const { Consumible } = require('../..');

const Neumatico = sequelize.define('Neumatico', {
    marca: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    medida: {
        type: DataTypes.STRING,
        allowNull: false,
    },



}, {
    tableName: 'Neumaticos',
    timestamps: true,
});

Neumatico.belongsTo(Consumible, { foreignKey: 'consumibleId' });

module.exports = Neumatico;