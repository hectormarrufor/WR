const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Compatibilidad = sequelize.define('Compatibilidad', {
    // Esta tabla de unión no necesita un ID propio,
    // la combinación de las dos claves foráneas será única.
    modeloId: {
        type: DataTypes.INTEGER,
        primaryKey: true, // Parte de la clave primaria compuesta
        references: {
            model: 'Modelos', // Nombre de la tabla de Modelos
            key: 'id'
        },
        onDelete: 'CASCADE', // Si se borra un modelo, se borra la compatibilidad
        onUpdate: 'CASCADE'
    },
    consumibleId: {
        type: DataTypes.INTEGER,
        primaryKey: true, // Parte de la clave primaria compuesta
        references: {
            model: 'INV_Consumibles', // Nombre de la tabla de Consumibles
            key: 'id'
        },
        onDelete: 'CASCADE', // Si se borra un consumible, se borra la compatibilidad
        onUpdate: 'CASCADE'
    }
}, {
    tableName: 'Compatibilidades',
    timestamps: false // Esta tabla no necesita createdAt ni updatedAt
});

// Este modelo no necesita una función 'associate' propia
// porque las asociaciones se definen desde Modelo y Consumible.

module.exports = Compatibilidad;