const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const Neumatico = sequelize.define('Neumatico', {
    marca: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    medida: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    modelo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    esTubeless: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // false = usa tripa/cámara, true = sello matic
    },
    esRecauchable: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // Define si el casco permite recauchado
    }
}, {
    tableName: 'Neumaticos',
    timestamps: true,
});

Neumatico.associate = (models) => {
    Neumatico.belongsTo(models.Consumible, { foreignKey: 'consumibleId' });
}
module.exports = Neumatico;