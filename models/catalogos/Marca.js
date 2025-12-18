const sequelize = require('../../sequelize');
const { DataTypes } = require('sequelize');


const Marca = sequelize.define('Marca', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    tipo: {
        type: DataTypes.ENUM("vehiculo", "filtro", "bateria", "aceite", "correa", "neumatico", "general"),
        allowNull: true,
    }
}, {
    tableName: 'Marcas',
    timestamps: true,
});

module.exports = Marca;