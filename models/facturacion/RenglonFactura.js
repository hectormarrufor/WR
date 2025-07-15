// models/RenglonFactura.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const RenglonFactura = sequelize.define('RenglonFactura', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  facturaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Facturas', // Nombre de la tabla del modelo Factura
      key: 'id',
    },
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  cantidad: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 1.00,
  },
  unidadMedida: {
    type: DataTypes.STRING, // Ej. "Unidad", "Litro", "Hora", "Servicio"
    allowNull: false,
  },
  precioUnitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
}, {
  tableName: 'RenglonFacturas',
  timestamps: true,
});

RenglonFactura.associate = (models) => {
    RenglonFactura.belongsTo(models.Factura, { foreignKey: 'facturaId' });
};

module.exports = RenglonFactura;
