const sequelize = require('../../sequelize');
const { DataTypes } = require('sequelize');


const Banco = sequelize.define('Banco', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    }
},{
    tableName: 'Bancos',
    timestamps: true,
});

module.exports = Banco;