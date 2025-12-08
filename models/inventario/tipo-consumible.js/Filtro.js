const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');
const Consumible = require('../Consumible');

const Filtro = sequelize.define('Filtro', {
    marca: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    tipo: {
        type: DataTypes.ENUM('aceite','aire','combustible','cabina'),
        allowNull: true,
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    equivalencias: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
    },
    posicion: { 
    type: DataTypes.ENUM('primario','secundario'), 
    allowNull: true 
  }

}, {
    tableName: 'Filtros',
    timestamps: true,
});

Filtro.belongsTo(Consumible, { foreignKey: 'consumibleId' });

module.exports = Filtro;