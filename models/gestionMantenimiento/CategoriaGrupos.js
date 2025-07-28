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
            model: 'Categorias',
            key: 'id'
        },
        allowNull: false
    },
    grupoId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'Grupos',
            key: 'id'
        },
        allowNull: false
    }
}, {
    tableName: 'CategoriaGrupos',
    timestamps: false
});

module.exports = CategoriaGrupos;