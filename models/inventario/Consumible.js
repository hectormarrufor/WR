const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Consumible = sequelize.define('Consumible', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tipoConsumibleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'TipoConsumibles', // nombre de la tabla
            key: 'id'
        }
    },
    nombre: { // Ej: "Aceite 15W40 Venoco", "Filtro WIX 51515"
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    marca: {
        type: DataTypes.STRING,
        allowNull: true,
    },
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
    inventario: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    costoPromedio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },

}, {
    tableName: 'Consumibles',
    timestamps: true,
    underscored: true,
});

Consumible.associate = (models) => {
    // Un consumible puede tener muchas entradas y salidas de inventario
    Consumible.hasMany(models.EntradaInventario, { foreignKey: 'consumibleId', as: 'entradas' });
    Consumible.hasMany(models.SalidaInventario, { foreignKey: 'consumibleId', as: 'salidas' });
    Consumible.belongsToMany(models.Modelo, {
        through: models.Compatibilidad, // La misma tabla intermedia
        foreignKey: 'consumibleId',
        otherKey: 'modeloId',
        as: 'modelosCompatibles'
    });
    Consumible.hasMany(models.ConsumibleUsado, { foreignKey: 'consumibleId' });


};

module.exports = Consumible;