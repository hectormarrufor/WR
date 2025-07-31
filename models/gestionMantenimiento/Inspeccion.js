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
        references: { model: 'Empleados', key: 'id' }
    },
    fecha: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    kilometrajeActual: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    observacionesGenerales: {
        type: DataTypes.TEXT,
    }
}, { tableName: 'Inspecciones', timestamps: true });

Inspeccion.associate = (models) => {
    Inspeccion.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo' });
    Inspeccion.belongsTo(models.Empleado, { foreignKey: 'inspectorId', as: 'inspector' });
    Inspeccion.hasMany(models.Hallazgo, { foreignKey: 'inspeccionId', as: 'hallazgos' });
};

module.exports = Inspeccion;