const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const Bateria = sequelize.define('Bateria', {
    marca: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    amperaje: { type: DataTypes.STRING, allowNull: false }, //1200
    capacidad: { type: DataTypes.STRING, allowNull: false }, 
    voltaje: { type: DataTypes.STRING, allowNull: false },
}, {
    tableName: 'Baterias',
    timestamps: true,
});

Bateria.associate = (models) => {
    Bateria.belongsTo(models.Consumible, { foreignKey: 'consumibleId' });
}

module.exports = Bateria;