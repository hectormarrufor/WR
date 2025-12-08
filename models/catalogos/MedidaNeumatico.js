const sequelize = require('../../sequelize');
const { DataTypes } = require('sequelize');


const MedidaNeumatico = sequelize.define('MedidaNeumatico', {
    medida: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: []
    }
},{
    tableName: 'MedidasNeumaticos',
    timestamps: true,
});

module.exports = MedidaNeumatico;