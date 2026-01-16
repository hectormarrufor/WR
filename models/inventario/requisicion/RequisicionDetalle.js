const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const RequisicionDetalle = sequelize.define('RequisicionDetalle', {
  cantidadSolicitada: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  cantidadAprobada: { // Lo que Compras realmente compró (a veces compran menos o más por empaque)
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'Ordenada', 'Recibida', 'Cancelada'),
    defaultValue: 'Pendiente'
  }
}, {
  tableName: 'RequisicionDetalles'
});

RequisicionDetalle.associate = (models) => {
  RequisicionDetalle.belongsTo(models.Requisicion, { foreignKey: 'requisicionId', as: 'requisicion' });
  
  // Qué producto es (Inventario)
  RequisicionDetalle.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });

  // EL PUENTE DE ORO:
  // Relacionamos esta línea de compra con la necesidad específica de mantenimiento.
  // Así, cuando esto pase a "Recibida", el sistema busca este ID y actualiza la ODT automáticamente.
  RequisicionDetalle.belongsTo(models.MantenimientoRepuesto, { 
    foreignKey: 'mantenimientoRepuestoId', 
    as: 'origenNecesidad' 
  });
};

module.exports = RequisicionDetalle;