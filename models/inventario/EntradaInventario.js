const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const EntradaInventario = sequelize.define('EntradaInventario', {
            cantidad: litrosNuevos,
            costoUnitario: costoTotalNuevo / litrosNuevos, // Costo de ESTA compra específica
            tipo: 'compra',
            origen: body.proveedor || 'Proveedor Externo',
            ordenCompra: body.ordenCompra, // Guardamos la referencia de la OC
            observacion: `Recepción de Combustible. OC: ${body.ordenCompra || 'N/A'}`,
            fecha: new Date(),
            usuarioId: 1 // TODO: ID real
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