const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const Filtro = sequelize.define('Filtro', {
    marca: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    tipo: {
        type: DataTypes.ENUM('aceite', 'aire', 'combustible', 'cabina'),
        allowNull: true,
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    posicion: {
        type: DataTypes.ENUM('primario', 'secundario'),
        allowNull: true
    },
    imagen: {
        type: DataTypes.STRING,
        allowNull: true,
    },

}, {
    tableName: 'Filtros',
    timestamps: true,
});

Filtro.associate = (models) => {
    Filtro.belongsTo(models.Consumible, { foreignKey: 'consumibleId' });
    Filtro.belongsTo(models.GrupoEquivalencia, { 
        foreignKey: 'grupoEquivalenciaId', 
        as: 'grupoEquivalencia' 
    });
}
module.exports = Filtro;