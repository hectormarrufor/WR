const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Consumible = sequelize.define('Consumible', {
    nombre: { // Ej: "Aceite 15W40 Venoco", "Filtro WIX 51515"
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    categoria: { type: DataTypes.ENUM('aceiteMotor','aceiteHidraulico','neumatico'), allowNull: false },

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
});

Consumible.associate = (models) => {
    // Un consumible puede tener muchas entradas y salidas de inventario
    Consumible.hasMany(models.SalidaInventario, { foreignKey: 'consumibleId' });
    Consumible.hasMany(models.EntradaInventario, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.AceiteMotor, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.Neumatico, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.AceiteHidraulico, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.Bateria, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.Filtro, { foreignKey: 'consumibleId' });
    Consumible.hasOne(models.Sensor, { foreignKey: 'consumibleId' });

    



};

module.exports = Consumible;