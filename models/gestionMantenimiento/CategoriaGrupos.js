// app/models/gestionMantenimiento/CategoriaGrupos.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const CategoriaGrupos = sequelize.define('CategoriaGrupos', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    categoriaId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'GG_Categorias',
            key: 'id'
        },
        allowNull: false
    },
    grupoId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'GG_Grupos',
            key: 'id'
        },
        allowNull: false
    }
}, {
    tableName: 'GG_CategoriaGrupos',
    timestamps: false
});

module.exports = CategoriaGrupos;