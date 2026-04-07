const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize'); // Asegúrate de que esta ruta sea la de tu proyecto wr

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
        allowNull: false,
    },
    costoTotal: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    kilometrajeAlMomento: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    kilometrosRecorridos: {
        type: DataTypes.FLOAT, 
        allowNull: true
    },
    rendimientoCalculado: {
        type: DataTypes.FLOAT, 
        allowNull: true
    },
    fullTanque: { 
        type: DataTypes.BOOLEAN,
        defaultValue: true, 
    },
    centimetrosVara: { type: DataTypes.FLOAT, allowNull: true, 
    },
  litrosAforados: { type: DataTypes.FLOAT, allowNull: true, 
},
});

// Relaciones
CargaCombustible.associate = (models) => {
    // 1. El equipo al que se le echó gasoil
    CargaCombustible.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo' });
    
    // 2. El registro del odómetro (opcional)
    CargaCombustible.belongsTo(models.Kilometraje, { foreignKey: 'kilometrajeId', as: 'registroKilometraje' }); 
    
    // 3. NUEVO: Si origen es 'interno', ¿de qué tanque del almacén (Consumible) salió el gasoil?
    CargaCombustible.belongsTo(models.Consumible, { foreignKey: 'consumibleOrigenId', as: 'tanqueOrigen' });
    
    // 4. NUEVO: Trazabilidad de quién operó la bomba o registró la factura externa
    CargaCombustible.belongsTo(models.User, { foreignKey: 'registradoPorId', as: 'registradoPor' });
    // NUEVO: Enlace operativo al viaje
    CargaCombustible.belongsTo(models.Flete, { foreignKey: 'fleteId', as: 'flete', constraints: false });
    
    // NUEVO: Enlace directo al gasto financiero de tesorería
    CargaCombustible.belongsTo(models.GastoVariable, { foreignKey: 'gastoVariableId', as: 'gasto' });
};

module.exports = CargaCombustible;