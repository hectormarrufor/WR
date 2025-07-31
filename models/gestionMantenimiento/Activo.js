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
    }
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
    Activo.hasMany(models.Mantenimiento, { 
        foreignKey: 'activoId', 
        as: 'mantenimientos' 
    });
    // Aquí irían las futuras relaciones con Inspecciones y Mantenimientos
    // Activo.hasMany(models.Inspeccion, { foreignKey: 'activoId', as: 'inspecciones' });
    // Activo.hasMany(models.Mantenimiento, { foreignKey: 'activoId', as: 'mantenimientos' });
};

module.exports = Activo;