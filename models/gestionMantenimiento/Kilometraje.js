const { DataTypes } = require('sequelize');
const Activo = require('./Activo.js');
const sequelize = require('../../sequelize.js');


const Kilometraje = sequelize.define('Kilometraje', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
    tableName: 'kilometrajes',
    timestamps: true,
});

Kilometraje.belongsTo(Activo, { foreignKey: 'activoId' });
Activo.hasMany(Kilometraje, { foreignKey: 'activoId', as: 'historial_kilometrajes' });

module.exports = Kilometraje;