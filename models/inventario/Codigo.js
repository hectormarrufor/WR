const sequelize = require('../../sequelize');
const { DataTypes } = require('sequelize');


const Codigo = sequelize.define('Codigo', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    }
},{
    tableName: 'Codigos',
    timestamps: true,
});

module.exports = Codigo;