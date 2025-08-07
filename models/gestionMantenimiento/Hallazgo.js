const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Hallazgo = sequelize.define('Hallazgo', {
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
    inspeccionId: { // Puede ser nulo si el hallazgo es generado por el sistema
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Inspecciones', key: 'id' }
    },
    ordenMantenimientoId: { // Se llena cuando se asigna a una orden
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    descripcion: {
        type: DataTypes.TEXT,
    },
    observacionInspector: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM('Pendiente', 'Asignado', 'Resuelto', 'Cerrado'),
        defaultValue: 'Pendiente',
    },
    severidad: {
        type: DataTypes.ENUM('Advertencia', 'Critico'),
        allowNull: false,
    },
    origen: { // Para saber si lo creó un usuario o el sistema
        type: DataTypes.ENUM('Manual', 'Sistema'),
        defaultValue: 'Manual',
    }
}, { tableName: 'Hallazgos', timestamps: true });

Hallazgo.associate = (models) => {
    Hallazgo.belongsTo(models.Activo, { foreignKey: 'activoId', as: 'activo' });
    Hallazgo.belongsTo(models.Inspeccion, { foreignKey: 'inspeccionId', as: 'inspeccion' });
    Hallazgo.associate = (models) => {
        // ... (asociaciones existentes)
        Hallazgo.belongsTo(models.Mantenimiento, {
            foreignKey: 'ordenMantenimientoId',
            as: 'ordenMantenimiento'
        });
    };
};

module.exports = Hallazgo;