const sequelize = require('../../sequelize');
const { DataTypes } = require('sequelize');

const Marca = sequelize.define('Marca', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: false,
    },
    tipo: {
        type: DataTypes.ENUM("vehiculo", "filtro", "bateria", "aceite", "correa", "neumatico", "general"),
        allowNull: true,
    }
}, {
    tableName: 'Marcas',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['nombre', 'tipo']
        }
    ]
});


module.exports = Marca;