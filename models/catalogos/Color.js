const sequelize = require('../../sequelize');
const { DataTypes } = require('sequelize');


const Color = sequelize.define('Color', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    }
},{
    tableName: 'Colores',
    timestamps: true,
});

module.exports = Color;