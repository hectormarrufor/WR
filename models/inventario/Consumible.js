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
    categoria: { type: DataTypes.ENUM('aceite', 'gasoil', 'filtro de aceite', 'filtro de aire', 'filtro de combustible', 'filtro de cabina', 'neumatico', 'bateria', 'sensor', 'correa'), allowNull: false },
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
    unidadMedida: {
        type: DataTypes.ENUM('litros', 'kilogramos', 'unidades', 'metros', 'galones'),
        allowNull: false
    }

}, {
    tableName: 'Consumibles',
    timestamps: true,
});

Consumible.associate = (models) => {
    Consumible.hasMany(models.ConsumibleSerializado, { foreignKey: 'consumibleId', as: 'serializados' , onDelete: 'CASCADE' });
    // Un consumible puede tener muchas entradas y salidas de inventario
    Consumible.hasMany(models.SalidaInventario, { foreignKey: 'consumibleId', onDelete: 'CASCADE' });
    Consumible.hasMany(models.EntradaInventario, { foreignKey: 'consumibleId', onDelete: 'CASCADE' });
    Consumible.hasOne(models.Aceite, { foreignKey: 'consumibleId' , onDelete: 'CASCADE' });
    Consumible.hasOne(models.Neumatico, { foreignKey: 'consumibleId' , onDelete: 'CASCADE' });
    Consumible.hasOne(models.Bateria, { foreignKey: 'consumibleId', onDelete: 'CASCADE' });
    Consumible.hasOne(models.Filtro, { foreignKey: 'consumibleId', onDelete: 'CASCADE' });
    Consumible.hasOne(models.Sensor, { foreignKey: 'consumibleId' , onDelete: 'CASCADE' });
    Consumible.hasOne(models.Correa, { foreignKey: 'consumibleId' , onDelete: 'CASCADE' });
    Consumible.hasMany(models.ConsumibleRecomendado, { foreignKey: 'consumibleId', as: 'recomendaciones', onDelete: 'CASCADE' });
    Consumible.hasMany(models.ConsumibleUsado, { foreignKey: 'consumibleId', as: 'usos',    onDelete: 'CASCADE' });
};



module.exports = Consumible;