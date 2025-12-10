const sequelize = require('../../sequelize');
const { DataTypes } = require('sequelize');


const Codigo = sequelize.define('Codigo', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    tipo: {
        type: DataTypes.ENUM('filtroAceite', 'filtroAire', 'filtroCombustible', 'filtroCabina', "correa", 'sensor'),
        allowNull: false,
    }
},{
    tableName: 'Codigos',
    timestamps: true,
});

module.exports = Codigo;