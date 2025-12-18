const sequelize = require('../../sequelize');
const { DataTypes } = require('sequelize');


const MedidaNeumatico = sequelize.define('MedidaNeumatico', {
    medida: {
        type: DataTypes.STRING,
        allowNull: false,
    }
},{
    tableName: 'MedidasNeumaticos',
    timestamps: true,
});

module.exports = MedidaNeumatico;