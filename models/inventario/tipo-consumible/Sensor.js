const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const Sensor = sequelize.define('Sensor', {
    marca: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: true,
    },
 }, {
    tableName: 'Sensores',
    timestamps: true,
});

Sensor.associate = (models) => {
    Sensor.belongsTo(models.Consumible, { foreignKey: 'consumibleId' });
}

module.exports = Sensor;