const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const MantenimientoRepuesto = sequelize.define('MantenimientoRepuesto', {
  cantidadRequerida: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  cantidadDespachada: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  estado: {
    type: DataTypes.ENUM(
      'Validando',       // Sistema revisando stock
      'En Stock',        // Hay existencia, listo para retirar
      'Sin Stock',       // No hay, requiere requisición
      'En Requisicion',  // Requisición creada
      'Comprado',        // Ya llegó a almacén
      'Despachado'       // Entregado al mecánico
    ),
    defaultValue: 'Validando'
  }
}, {
  tableName: 'MantenimientoRepuestos'
});

MantenimientoRepuesto.associate = (models) => {
  MantenimientoRepuesto.belongsTo(models.OrdenMantenimiento, { foreignKey: 'ordenMantenimientoId', as: 'orden' });
  // Qué consumible se necesita
  MantenimientoRepuesto.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
  
  // Si no había stock, se vincula con la Requisición (cuando crees ese modelo)
  MantenimientoRepuesto.belongsTo(models.Requisicion, { foreignKey: 'requisicionId', as: 'requisicion' });
  MantenimientoRepuesto.belongsTo(models.TareaMantenimiento, { 
    foreignKey: 'tareaMantenimientoId', 
    as: 'tareaAsociada',
    allowNull: true // Es opcional, porque a veces pides repuestos generales (trapos, desengrasante) que no van a una tarea fija
  });
};

module.exports = MantenimientoRepuesto;