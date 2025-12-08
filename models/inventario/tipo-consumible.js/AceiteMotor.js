const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');
const Consumible = require('../Consumible');

const AceiteMotor = sequelize.define('AceiteMotor', {
    marca: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    tipo: {
        type: DataTypes.ENUM('mineral', 'semi', 'sintético'),
        allowNull: true,
        defaultValue: {},
    },
    viscosidad: { type: DataTypes.STRING, allowNull: false }, // 15W40

}, {
    tableName: 'AceitesMotor',
    timestamps: true,
});

AceiteMotor.belongsTo(Consumible, { foreignKey: 'consumibleId' });

module.exports = AceiteMotor;