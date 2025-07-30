const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const SalidaInventario = sequelize.define('SalidaInventario', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    consumibleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Consumibles', key: 'id' }
    },
    activoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Activos', key: 'id' }
    },
    cantidad: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    fecha: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    justificacion: {
        type: DataTypes.TEXT,
        allowNull: true, // Puede ser opcional, dependiendo de tus reglas de negocio
        comment: 'Motivo de la salida del inventario (ej: Mantenimiento Preventivo, Reparación de Falla).'
    },

    // // ✨ NUEVO CAMPO 2: Para enlazar con el módulo de Mantenimiento (a futuro) ✨
    // mantenimientoId: {
    //     type: DataTypes.INTEGER,
    //     allowNull: true, // Se hará obligatorio cuando se use desde una orden de trabajo
    //     comment: 'Enlaza esta salida a una orden de mantenimiento específica.'
    // },
    // Este campo es para el futuro, para enlazar con una tarea de mantenimiento específica.
    tareaMantenimientoId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    costoAlMomento: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    }
}, {
    tableName: 'SalidasInventario',
    timestamps: true,
    underscored: true,
});

SalidaInventario.associate = (models) => {
    SalidaInventario.belongsTo(models.Consumible, {
        foreignKey: 'consumibleId',
        as: 'consumible'
    });
    SalidaInventario.belongsTo(models.Activo, {
        foreignKey: 'activoId',
        as: 'activo'
    });
};

module.exports = SalidaInventario;