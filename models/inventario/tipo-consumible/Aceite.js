const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const Aceite = sequelize.define('Aceite', {
    marca: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    modelo: { type: DataTypes.STRING, allowNull: true },
    tipo: {
        type: DataTypes.ENUM('mineral', 'semi', 'sintético'),
        allowNull: true,
    },
    viscosidad: { type: DataTypes.STRING, allowNull: false }, // 15W40
    aplicacion: {
        type: DataTypes.ENUM('motor', 'hidraulico'),
        allowNull: false,
    },

}, {
    tableName: 'Aceites',
    timestamps: true,
});

Aceite.associate = (models) => {
    Aceite.belongsTo(models.Consumible, { foreignKey: 'consumibleId' });
}


module.exports = Aceite;