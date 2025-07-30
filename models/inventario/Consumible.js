const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Consumible = sequelize.define('Consumible', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: { // Ej: "Aceite 15W40 Venoco", "Filtro WIX 51515"
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    sku: { // "Stock Keeping Unit" o código de parte
        type: DataTypes.STRING,
        unique: true,
    },
    // ✨ CAMPO CLAVE 1: Para diferenciar y renderizar formularios distintos
    tipo: { 
        type: DataTypes.ENUM('Aceite', 'Filtro', 'Correa', 'Repuesto', 'Otro'),
        allowNull: false,
    },
    // ✨ CAMPO CLAVE 2: Para guardar detalles específicos (viscosidad, tamaño, etc.)
    especificaciones: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
    },
    stock: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    stockMinimo: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    unidadMedida: { // Ej: "Litros", "Unidad", "Metros"
        type: DataTypes.STRING,
    },
    costoPromedio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    }
}, {
    tableName: 'Consumibles',
    timestamps: true,
    underscored: true,
});

Consumible.associate = (models) => {
    // Un consumible puede tener muchas entradas y salidas de inventario
    Consumible.hasMany(models.EntradaInventario, { foreignKey: 'consumibleId', as: 'entradas' });
    Consumible.hasMany(models.SalidaInventario, { foreignKey: 'consumibleId', as: 'salidas' });

    // ✨ ASOCIACIÓN CLAVE: Un consumible es compatible con muchos modelos (y viceversa)
    Consumible.belongsToMany(models.Modelo, {
        through: 'CompatibilidadModeloConsumible', // La nueva tabla intermedia
        foreignKey: 'consumibleId',
        otherKey: 'modeloId',
        as: 'modelosCompatibles'
    });
};

module.exports = Consumible;