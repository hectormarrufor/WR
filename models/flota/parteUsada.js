const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const ParteUsada = sequelize.define('ParteUsada', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    costoIndividual: { // Costo al momento de la compra/uso
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    tareaMantenimientoId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'TareaMantenimientos',
            key: 'id',
        },
        allowNull: false,
    },
    parteId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'Partes',
            key: 'id',
        },
        allowNull: false,
    },
});

ParteUsada.associate = (models) => {
    ParteUsada.belongsTo(models.TareaMantenimiento, { foreignKey: 'tareaMantenimientoId', as: 'tareaMantenimiento' });
    ParteUsada.belongsTo(models.Parte, { foreignKey: 'parteId', as: 'parte' });
};


module.exports = ParteUsada;