const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const EntradaInventario = sequelize.define('EntradaInventario', {
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