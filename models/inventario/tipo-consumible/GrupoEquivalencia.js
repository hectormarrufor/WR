// models/inventario/GrupoEquivalencia.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const GrupoEquivalencia = sequelize.define('GrupoEquivalencia', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        // Ej: "Equivalentes al filtro fleetguard LF3403"
    }
}, { timestamps: true,
 });

GrupoEquivalencia.associate = (models) => {
    GrupoEquivalencia.hasMany(models.Filtro, { foreignKey: 'grupoEquivalenciaId', as: 'filtros' });
}

module.exports = GrupoEquivalencia;