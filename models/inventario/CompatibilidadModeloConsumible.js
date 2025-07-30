const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const CompatibilidadModeloConsumible = sequelize.define('CompatibilidadModeloConsumible', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    modeloId: { // Apunta al Modelo del componente (ej: el ID del Modelo "Motor Vortec")
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Modelos', key: 'id' } // Tabla de Modelos de Flota
    },
    consumibleId: { // Apunta al Consumible (ej: el ID del "Filtro WIX 51515")
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Consumibles', key: 'id' }
    },
    // ✨ CAMPO CLAVE: Nos dice a qué 'slot' del modelo aplica este consumible
    atributoId: { 
        type: DataTypes.STRING, // ej: "filtroAceite_1"
        allowNull: false,
        comment: 'El ID del atributo en el JSONB de especificaciones del modelo.'
    }
}, {
    tableName: 'CompatibilidadModeloConsumible',
    timestamps: false,
    underscored: true,
});

module.exports = CompatibilidadModeloConsumible;