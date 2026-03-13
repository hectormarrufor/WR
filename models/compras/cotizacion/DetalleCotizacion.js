// models/compras/CotizacionDetalle.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../../sequelize');

const CotizacionDetalle = sequelize.define('CotizacionDetalle', {
  marcaOfertada: {
    type: DataTypes.STRING,
    allowNull: true, // Importante: Pedimos filtro WIX, pero cotizaron marca WEBBER.
  },
  cantidadOfertada: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false, // A veces venden por caja de 12 aunque pidamos 10
  },
  precioUnitario: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  porcentajeImpuesto: {
    type: DataTypes.DECIMAL(5, 2), // Ej: 16.00 para IVA
    defaultValue: 16.00,
  },
  subtotalLinea: {
    type: DataTypes.DECIMAL(12, 2),
    // Virtual o calculado antes de guardar (precioUnitario * cantidadOfertada)
  },
  // ESTE ES EL SEMÁFORO DE LA LICITACIÓN:
  estadoSeleccion: {
    type: DataTypes.ENUM('Pendiente', 'Ganador', 'Perdedor'),
    defaultValue: 'Pendiente',
  }
}, {
  tableName: 'CotizacionDetalles',
  timestamps: true,
});

CotizacionDetalle.associate = (models) => {
  CotizacionDetalle.belongsTo(models.Cotizacion, { foreignKey: 'cotizacionId', as: 'cotizacion' });
  
  // El producto genérico que están ofreciendo
  CotizacionDetalle.belongsTo(models.Consumible, { foreignKey: 'consumibleId', as: 'consumible' });
  
  // 🔥 EL PUENTE MÁGICO AL CUADRO COMPARATIVO 🔥
  // Conecta este precio con la línea exacta de la Requisición
  CotizacionDetalle.belongsTo(models.RequisicionDetalle, { foreignKey: 'requisicionDetalleId', as: 'lineaRequisicion' });
};

module.exports = CotizacionDetalle;