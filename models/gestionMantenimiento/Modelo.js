// app/models/gestionMantenimiento/Modelo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Modelo = sequelize.define('Modelo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    especificaciones: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
    },
    categoriaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Categorias',
            key: 'id'
        },
    }
}, {
    tableName: 'Modelos',
    timestamps: true,
});

Modelo.associate = (models) => {
    Modelo.belongsTo(models.Categoria, {
        foreignKey: 'categoriaId',
        as: 'categoria'
    });
    Modelo.belongsToMany(models.Consumible, {
        through: 'CompatibilidadModeloConsumible', // Tabla intermedia
        foreignKey: 'modeloId',
        otherKey: 'consumibleId',
        as: 'consumiblesCompatibles'
    })
};

module.exports = Modelo;