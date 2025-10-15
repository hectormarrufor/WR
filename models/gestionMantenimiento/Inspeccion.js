const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Inspeccion = sequelize.define('Inspeccion', {
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
    inspectorId: { // El empleado que realiza la inspección
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' }
    },
    fecha: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    kilometrajeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Kilometrajes', key: 'id' }
    },
    horometroId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Horometros', key: 'id' }
    },
    resultadosChecklist: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
   
}, { tableName: 'Inspecciones', timestamps: true });

Inspeccion.associate = (models) => {
    Inspeccion.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo' });
    Inspeccion.belongsTo(models.User, { foreignKey: 'inspectorId', as: 'inspector' });
    Inspeccion.hasMany(models.Hallazgo, { foreignKey: 'inspeccionId', as: 'hallazgos' });
    Inspeccion.belongsTo(models.Kilometraje, { foreignKey: 'kilometrajeId', as: 'kilometraje' });
    Inspeccion.belongsTo(models.Horometro, { foreignKey: 'horometroId', as: 'horometro' });
};

module.exports = Inspeccion;