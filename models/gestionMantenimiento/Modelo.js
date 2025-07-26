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
            model: 'GG_Categorias',
            key: 'id'
        },
    }
}, {
    tableName: 'GG_Modelos',
    timestamps: true,
    underscored: true,
});

Modelo.associate = (models) => {
    Modelo.belongsTo(models.Categoria, {
        foreignKey: 'categoriaId',
        as: 'categoria'
    });

    // Relación de composición (Many-to-Many con sigo mismo)
    // Un modelo (ensamblaje) puede estar compuesto de muchos otros modelos (componentes)
    Modelo.belongsToMany(models.Modelo, {
        through: 'GG_ModeloComponentes',
        as: 'componentes', // ej: los componentes de una Silverado
        foreignKey: 'ensamblajeId', // El ID del modelo que se está armando
        otherKey: 'componenteId' // El ID del modelo que forma parte del ensamblaje
    });

    // La relación inversa es útil también
    Modelo.belongsToMany(models.Modelo, {
        through: 'GG_ModeloComponentes',
        as: 'ensamblajes', // ej: en qué ensamblajes se usa un Motor Vortec
        foreignKey: 'componenteId',
        otherKey: 'ensamblajeId'
    });
};

module.exports = Modelo;