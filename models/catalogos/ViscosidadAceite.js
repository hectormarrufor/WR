const sequelize = require('../../sequelize');
const { DataTypes } = require('sequelize');


const ViscosidadAceite = sequelize.define('ViscosidadAceite', {
    viscosidades: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: []
    },
    tipo: {
        type: DataTypes.ENUM("motor", "hidraulico"),
        allowNull: true,
    }
},{
    tableName: 'ViscosidadesAceite',
    timestamps: true,
});

module.exports = ViscosidadAceite;