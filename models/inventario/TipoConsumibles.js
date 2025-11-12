// models/inventario/TipoConsumible.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const TipoConsumible = sequelize.define('TipoConsumible', {

    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    unidadMedida: {
        type: DataTypes.STRING,
        allowNull: true
    },
    especificaciones: {
        type: DataTypes.JSONB, // aquí guardas el esqueleto dinámico
        allowNull: true
    },
    atributosUso: {
        type: DataTypes.JSONB,
        allowNull: true
    }

},
    {
        tableName: 'TipoConsumibles',
        timestamps: true,
        underscored: true,
    }
);
TipoConsumible.associate = (models) => {
    TipoConsumible.hasMany(models.Consumible, { foreignKey: 'tipoConsumibleId' });
};

module.exports = TipoConsumible;