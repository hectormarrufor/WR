const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const TareaMantenimiento = sequelize.define('TareaMantenimiento', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    mantenimientoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Mantenimientos', key: 'id' }
    },
    // El técnico o mecánico asignado a esta tarea específica
    tecnicoId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Empleados', key: 'id' }
    },
    descripcion: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Ej: Drenar aceite de motor, Reemplazar filtro primario.'
    },
    estado: {
        type: DataTypes.ENUM('Pendiente', 'En Progreso', 'Completada'),
        defaultValue: 'Pendiente',
    },
    observaciones: {
        type: DataTypes.TEXT,
    }
}, {
    tableName: 'TareasMantenimiento',
    timestamps: true,
    underscored: true,
});

TareaMantenimiento.associate = (models) => {
    // Una tarea pertenece a una sola Orden de Mantenimiento
    TareaMantenimiento.belongsTo(models.Mantenimiento, {
        foreignKey: 'mantenimientoId',
        as: 'ordenMantenimiento'
    });

    // Una tarea es ejecutada por un técnico (Empleado)
    TareaMantenimiento.belongsTo(models.Empleado, {
        foreignKey: 'tecnicoId',
        as: 'tecnico'
    });

    // Una tarea puede consumir varios repuestos del inventario.
    // Esto conecta la tarea directamente con la salida justificada.
    TareaMantenimiento.hasMany(models.SalidaInventario, {
        foreignKey: 'tareaMantenimientoId',
        as: 'consumiblesUtilizados'
    });
};

module.exports = TareaMantenimiento;