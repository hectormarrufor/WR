const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const EntradaInventario = sequelize.define('EntradaInventario', {
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
    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' } // Asegúrate de que la tabla Usuarios exista
    },
    cantidad: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    costoUnitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    proveedor: {
        type: DataTypes.STRING,
    },
    fecha: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'EntradasInventario',
    timestamps: true,
});

EntradaInventario.associate = (models) => {
    EntradaInventario.belongsTo(models.Consumible, {
        foreignKey: 'consumibleId',
        as: 'consumible'
    });
    EntradaInventario.belongsTo(models.User, {
        foreignKey: 'usuarioId',
        as: 'usuario'
    });
};

module.exports = EntradaInventario;