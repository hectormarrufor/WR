const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const FichaTecnica = sequelize.define(
    'FichaTecnica',
    {
        ejes: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        tipo: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        tipoPeso: {
            type: DataTypes.ENUM('liviana', 'pesada'),
            allowNull: false,
        },
        correas: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        neumaticos: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        combustible: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        transmision: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        motor: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        carroceria: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        vehiculoId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Vehiculos', // Nombre de la tabla a la que se refiere
                key: 'id',
            },
            unique: true, // Una ficha técnica por vehículo
            allowNull: false,
        },
    },
    {
        tableName: 'FichasTecnicas',
        timestamps: true,
    }
);

FichaTecnica.associate = (models) => {
    FichaTecnica.belongsTo(models.Vehiculo, { foreignKey: 'vehiculoId', as: 'vehiculo' });
};

module.exports = FichaTecnica;