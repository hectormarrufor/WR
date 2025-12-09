const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');
const Consumible = require('../Consumible');

const Bateria = sequelize.define('Bateria', {
    marca: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: {},
    },
    amperaje: { type: DataTypes.STRING, allowNull: false }, //1200
    capacidadArranque: { type: DataTypes.STRING, allowNull: false }, 
    voltaje: { type: DataTypes.STRING, allowNull: false },
    fechaVencimientoGarantia: { type: DataTypes.DATE, allowNull: true },
    fechaCompra: { type: DataTypes.DATE, allowNull: true },
    


}, {
    tableName: 'Baterias',
    timestamps: true,
});

Bateria.belongsTo(Consumible, { foreignKey: 'consumibleId' });

module.exports = Bateria;