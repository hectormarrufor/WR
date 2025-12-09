// models/inventario/DetalleOrdenCompra.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');
const DetalleOrdenCompra = sequelize.define('DetalleOrdenCompra', {
  cantidadSolicitada: {
    type: DataTypes.DECIMAL(15, 3),
    allowNull: false,
  },
  precioUnitario: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
}, {
  tableName: 'DetallesOrdenCompra',
  timestamps: true,
});

DetalleOrdenCompra.associate = (models) => {
  DetalleOrdenCompra.belongsTo(models.OrdenCompra, { foreignKey: 'ordenCompraId', as: 'ordenCompra' });
  DetalleOrdenCompra.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
  DetalleOrdenCompra.hasMany(models.DetalleRecepcionCompra, {
    foreignKey: 'consumibleId', // OJO: esto debe enlazar por el item, no por el detalle en sí
    sourceKey: 'consumibleId', // Usar consumibleId del DetalleOrdenCompra
    as: 'recepciones', // Puede ser complejo rastrear esto directamente sin un campo intermedio
    // Alternativa: Podría ser mejor calcular la cantidad recibida acumulada al vuelo
    // o añadir 'ordenCompraDetalleId' a DetalleRecepcionCompra.
    // Por simplicidad, por ahora lo dejamos a nivel de lógica de negocio o se calcula.
    // La forma más robusta sería un campo `ordenCompraDetalleId` en `DetalleRecepcionCompra`
    // y asociarlo a `DetalleOrdenCompra`
  });
  DetalleOrdenCompra.hasMany(models.DetalleFacturaProveedor, {
    foreignKey: 'detalleOrdenCompraId',
    as: 'detallesFacturaProveedor',
  });
};

module.exports = DetalleOrdenCompra;
