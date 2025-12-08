const sequelize = require('../../sequelize');
const { DataTypes } = require('sequelize');


const ViscosidadAceite = sequelize.define('ViscosidadAceite', {
    viscosidades: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: []
    }
},{
    tableName: 'ViscosidadesAceite',
    timestamps: true,
});

module.exports = ViscosidadAceite;