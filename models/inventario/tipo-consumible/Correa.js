const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const Correa = sequelize.define('Correa', {
    marca: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'Correas',
    timestamps: true,
});

Correa.associate = (models) => {
    Correa.belongsTo(models.Consumible, { foreignKey: 'consumibleId' });
}

module.exports = Correa;