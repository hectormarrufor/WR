const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const EntradaInventario = sequelize.define('EntradaInventario', {
            cantidad: {
                type: DataTypes.DECIMAL(18, 4),
                allowNull: false
                },
            costoUnitario: {
                type: DataTypes.DECIMAL(18, 4),
                allowNull: false
            },
            tipo: {
                type: DataTypes.ENUM('Compra', 'Otro'),
                allowNull: false,
                defaultValue: 'Otro'
            },
            observacion: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: `Recepción de Combustible. OC: N/A`
            },
            fecha: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            usuarioId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1 // TODO: ID real
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
    EntradaInventario.belongsTo(models.RecepcionCompraItem, { foreignKey: 'recepcionCompraItemId', as: 'recepcionItem' });
};

module.exports = EntradaInventario;