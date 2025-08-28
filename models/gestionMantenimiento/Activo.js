// app/models/gestionMantenimiento/Activo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Activo = sequelize.define('Activo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    codigoActivo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    modeloId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Modelos',
            key: 'id'
        },
    },
    datosPersonalizados: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
    },
    estadoOperativo: {
        type: DataTypes.STRING,
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
    Activo.belongsTo(models.Modelo, {
        foreignKey: 'modeloId',
        as: 'modelo'
    });

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
    Activo.hasMany(models.Kilometraje, {
        foreignKey: 'activoId', // Asegúrate de que el nombre de la FK sea consistente
        as: 'kilometrajes'
    });

    Activo.hasMany(models.Horometro, {
        foreignKey: 'activoId',
        as: 'horometros'
    });

    // Aquí irían las futuras relaciones con Inspecciones y Mantenimientos
    // Activo.hasMany(models.Inspeccion, { foreignKey: 'activoId', as: 'inspecciones' });
    // Activo.hasMany(models.Mantenimiento, { foreignKey: 'activoId', as: 'mantenimientos' });
};

module.exports = Activo;