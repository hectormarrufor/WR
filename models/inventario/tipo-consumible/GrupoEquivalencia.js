// models/inventario/GrupoEquivalencia.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const GrupoEquivalencia = sequelize.define('GrupoEquivalencia', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        // Ej: "Equivalentes al filtro fleetguard LF3403"
    },
    categoria: {
        type: DataTypes.ENUM('aceite', 'filtro de aceite', 'filtro de aire', 'filtro de combustible', 'filtro de cabina', 'neumatico', 'bateria', 'sensor', 'correa'), 
        allowNull: true,
    },
    // Aquí guardamos: '11R22.5' (si es neumático), 'MT-34' (si es batería) 
    // o simplemente el nombre del grupo si es filtro.
    criterioTecnico: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, { timestamps: true,
 });

GrupoEquivalencia.associate = (models) => {
    GrupoEquivalencia.hasMany(models.Filtro, { foreignKey: 'grupoEquivalenciaId', as: 'filtros' });
    GrupoEquivalencia.hasMany(models.Neumatico, { foreignKey: 'grupoEquivalenciaId', as: 'neumaticos' });
    GrupoEquivalencia.hasMany(models.Bateria, { foreignKey: 'grupoEquivalenciaId', as: 'baterias' });
    GrupoEquivalencia.hasMany(models.Aceite, { foreignKey: 'grupoEquivalenciaId', as: 'aceites' });
    GrupoEquivalencia.hasMany(models.Sensor, { foreignKey: 'grupoEquivalenciaId', as: 'sensores' });
    GrupoEquivalencia.hasMany(models.Correa, { foreignKey: 'grupoEquivalenciaId', as: 'correas' });
    GrupoEquivalencia.hasMany(models.ConsumibleRecomendado, { foreignKey: 'grupoEquivalenciaId', as: 'consumiblesRecomendados' });  
}

module.exports = GrupoEquivalencia;