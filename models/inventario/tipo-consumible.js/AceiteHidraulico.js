const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');
const Consumible = require('../Consumible');

const AceiteHidraulico = sequelize.define('AceiteHidraulico', {
    marca: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    viscosidad: { type: DataTypes.STRING, allowNull: false }, 

}, {
    tableName: 'AceitesHidraulico',
    timestamps: true,
});

AceiteHidraulico.belongsTo(Consumible, { foreignKey: 'consumibleId' });

module.exports = AceiteHidraulico;