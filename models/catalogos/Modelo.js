const sequelize = require('../../sequelize');
const { DataTypes } = require('sequelize');


const Modelo = sequelize.define('Modelo', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    tipo: {
        type: DataTypes.ENUM("vehiculo", "bateria", "aceite", "neumatico", "general"),
        allowNull: true,
    }
}, {
    tableName: 'Modelos',
    timestamps: true,
});

module.exports = Modelo;