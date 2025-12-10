const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

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

AceiteHidraulico.associate = (models) => {
    AceiteHidraulico.belongsTo(models.Consumible, { foreignKey: 'consumibleId' });
}

module.exports = AceiteHidraulico;