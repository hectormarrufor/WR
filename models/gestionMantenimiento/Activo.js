// app/models/gestionMantenimiento/Activo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Activo = sequelize.define('Activo', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    grupo: {
        type: DataTypes.ENUM(
            'vehiculo',
            'remolque',
            'maquina',
            'generador',
            'otro'
        ),
    },
    categoria: {
        type: DataTypes.ENUM(
            'chuto',
            'vaccum',
            'batea',
            'montacargas',
            'camioneta',
            'maquina de soldar',
            'retroexcavadora',
            'planta electrica',
            'otro',
            "bomba de agua"
        ),
        allowNull: false,
    },
    estadoOperativo: {
        type: DataTypes.ENUM('Operativo', 'No operativo', 'Operativo con advertencias'),
        allowNull: false,
        defaultValue: 'Operativo',
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    imagen: {
        type: DataTypes.TEXT, // Usamos TEXT para almacenar la imagen en formato Base64
        allowNull: true,
    },
}, {
    tableName: 'Activos',
    timestamps: true,
});

Activo.associate = (models) => {
    Activo.hasMany(models.ConsumibleSerializado, { foreignKey: 'activoId', as: 'consumiblesSerializados' });

    Activo.belongsTo(models.VehiculoInstancia, { foreignKey: 'vehiculoInstanciaId', as: 'instancia' });
    Activo.belongsTo(models.RemolqueInstancia, { foreignKey: 'remolqueInstanciaId', as: 'instancia' });
    Activo.belongsTo(models.MaquinaInstancia, { foreignKey: 'maquinaInstanciaId', as: 'instancia' });



    Activo.hasMany(models.Inspeccion, {
        foreignKey: 'activoId',
        as: 'inspecciones'
    });
    Activo.hasMany(models.Hallazgo, {
        foreignKey: 'activoId',
        as: 'hallazgos'
    });
    Activo.hasMany(models.Mantenimiento, {
        foreignKey: 'activoId',
        as: 'mantenimientos'
    });
};

module.exports = Activo;