// app/models/gestionMantenimiento/ModeloComponentes.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const ModeloComponentes = sequelize.define('ModeloComponentes', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    // El modelo principal, el "todo"
    ensamblajeId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'GG_Modelos',
            key: 'id'
        },
        allowNull: false
    },
    // El modelo que es una "parte"
    componenteId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'GG_Modelos',
            key: 'id'
        },
        allowNull: false
    }
}, {
    tableName: 'GG_ModeloComponentes',
    timestamps: false,
});

module.exports = ModeloComponentes;