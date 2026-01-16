const { DataTypes } = require('sequelize');
const  sequelize  = require('../../../sequelize');

const Requisicion = sequelize.define('Requisicion', {
  codigo: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false // Ej: REQ-2026-089
  },
  fechaSolicitud: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  prioridad: {
    type: DataTypes.ENUM('Baja', 'Media', 'Alta', 'Critica'),
    defaultValue: 'Media'
  },
  justificacion: {
    type: DataTypes.TEXT, // Ej: "Repuestos faltantes para ODT-500 Camión Mack"
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM(
      'Pendiente',       // Creada por Mantenimiento
      'En Cotizacion',   // Compras está buscando proveedores
      'Aprobada',        // Gerencia aprobó presupuesto
      'Orden Compra',    // Ya se pidió al proveedor
      'Parcial',         // Llegaron algunas cosas
      'Cerrada',         // Llegó todo
      'Rechazada'
    ),
    defaultValue: 'Pendiente'
  },
  observacionesCompras: {
    type: DataTypes.TEXT // Compras escribe: "Proveedor X no tiene stock, tardará 3 días"
  }
}, {
  tableName: 'Requisiciones'
});

Requisicion.associate = (models) => {
  // Relación CLAVE: Saber de qué Orden viene (Trazabilidad)
  Requisicion.belongsTo(models.OrdenMantenimiento, { 
    foreignKey: 'ordenMantenimientoId', 
    as: 'ordenOrigen' // Puede ser null si es reposición de stock general
  });

  // Quién la pidió (Jefe de Taller)
  Requisicion.belongsTo(models.User, { foreignKey: 'solicitadoPorId', as: 'solicitante' });
  
  // Sus detalles (Items)
  Requisicion.hasMany(models.RequisicionDetalle, { foreignKey: 'requisicionId', as: 'detalles' });
};

module.exports = Requisicion;