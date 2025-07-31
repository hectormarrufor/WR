const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Mantenimiento = sequelize.define('Mantenimiento', {
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
    // El empleado que supervisa o es responsable de la orden
    responsableId: {
        type: DataTypes.INTEGER,
        allowNull: true, 
        references: { model: 'Empleados', key: 'id' }
    },
    // Un código único para la orden de trabajo
    codigoOM: {
        type: DataTypes.STRING,
        unique: true,
        comment: 'Código único para la Orden de Mantenimiento'
    },
    tipo: {
        type: DataTypes.ENUM('Preventivo', 'Correctivo', 'Predictivo', 'Mejora'),
        allowNull: false,
    },
    estado: {
        type: DataTypes.ENUM('Pendiente', 'Planificado', 'En Progreso', 'En Espera de Repuestos', 'Completado', 'Cancelado'),
        defaultValue: 'Pendiente',
    },
    prioridad: {
        type: DataTypes.ENUM('Baja', 'Media', 'Alta', 'Urgente'),
        defaultValue: 'Media',
    },
    fechaInicio: {
        type: DataTypes.DATE,
    },
    fechaFin: {
        type: DataTypes.DATE,
    },
    descripcion: {
        type: DataTypes.TEXT,
        comment: 'Descripción general del trabajo a realizar.'
    }
}, {
    tableName: 'Mantenimientos', // MNT por "Mantenimiento"
    timestamps: true,
    underscored: true,
});

Mantenimiento.associate = (models) => {
    // Una orden pertenece a un solo Activo
    Mantenimiento.belongsTo(models.Activo, {
        foreignKey: 'activoId',
        as: 'activo'
    });
    
    // Una orden tiene un Empleado responsable
    Mantenimiento.belongsTo(models.Empleado, {
        foreignKey: 'responsableId',
        as: 'responsable'
    });

    // Una orden agrupa varios Hallazgos. Cuando un hallazgo se asocia, se actualiza su FK.
    Mantenimiento.hasMany(models.Hallazgo, {
        foreignKey: 'ordenMantenimientoId',
        as: 'hallazgos'
    });

    // Una orden se desglosa en varias Tareas
    Mantenimiento.hasMany(models.TareaMantenimiento, {
        foreignKey: 'mantenimientoId',
        as: 'tareas'
    });
};

module.exports = Mantenimiento;