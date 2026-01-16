const { DataTypes } = require('sequelize');
const Activo = require('./Activo.js');
const sequelize = require('../../sequelize.js');


const Kilometraje = sequelize.define('Kilometraje', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    activoId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'Activos', key: 'id' }
        },
    fecha_registro: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    valor: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
}, {
    tableName: 'Kilometrajes',
    timestamps: true,
});

//Relaciones
Kilometraje.associate = (models) => {

Kilometraje.hasOne(models.CargaCombustible, { foreignKey: 'kilometrajeId' });
Kilometraje.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo' });

}

module.exports = Kilometraje;