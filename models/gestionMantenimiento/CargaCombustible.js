// models/CargaCombustible.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const CargaCombustible = sequelize.define('CargaCombustible', {
    fecha: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    litros: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    origen: {
        type: DataTypes.ENUM('interno', 'externo'),
        allowNull: true
    },
    costoTotal: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    // Capturamos el kilometraje EXACTO al momento de echar gasolina
    kilometrajeAlMomento: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    // Campos calculados para facilitar gráficas (se llenan en el backend)
    kilometrosRecorridos: {
        type: DataTypes.FLOAT, 
        // Diferencia vs carga anterior
    },
    rendimientoCalculado: {
        type: DataTypes.FLOAT, 
        // KilometrosRecorridos / Litros = Km por Litro
    },
    fullTanque: { //si no se lleno el tanque, no se puede calcular rendimiento exacto
        type: DataTypes.BOOLEAN,
        defaultValue: true, 
    }
});

// Relaciones
CargaCombustible.associate = (models) => {
    CargaCombustible.belongsTo(models.Activo, { foreignKey: 'activoId' });
    CargaCombustible.belongsTo(models.Kilometraje, { foreignKey: 'kilometrajeId' }); // Vínculo opcional
};

module.exports = CargaCombustible;