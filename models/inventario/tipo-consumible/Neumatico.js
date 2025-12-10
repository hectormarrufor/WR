const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

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

Neumatico.associate = (models) => {
    Neumatico.belongsTo(models.Consumible, { foreignKey: 'consumibleId' });
}
module.exports = Neumatico;