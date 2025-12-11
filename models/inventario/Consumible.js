const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Consumible = sequelize.define('Consumible', {
    nombre: { // Ej: "Aceite 15W40 Venoco", "Filtro WIX 51515"
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    tipo: {
        type: DataTypes.ENUM('fungible', 'serializado'),
        allowNull: false

    },
    categoria: { type: DataTypes.ENUM('aceite de motor', 'aceite hidraulico', 'filtro de aceite', 'filtro de aire', 'filtro de combustible', 'filtro de cabina', 'neumatico', 'bateria', 'sensor', 'correa'), allowNull: false },
    stockAlmacen: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    stockAsignado: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    stockMinimo: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    precioPromedio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },

}, {
    tableName: 'Consumibles',
    timestamps: true,
});

Consumible.associate = (models) => {
    Consumible.hasMany(models.ConsumibleSerializado, { foreignKey: 'consumibleId', as: 'serializados' });

    // Un consumible puede tener muchas entradas y salidas de inventario
    Consumible.hasMany(models.SalidaInventario, { foreignKey: 'consumibleId' });
    Consumible.hasMany(models.EntradaInventario, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.AceiteMotor, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.Neumatico, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.AceiteHidraulico, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.Bateria, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.Filtro, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.Sensor, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.Correa, { foreignKey: 'consumibleId' });
    Consumible.hasMany(models.ConsumibleRecomendado, { foreignKey: 'consumibleId', as: 'recomendaciones' });





};

module.exports = Consumible;