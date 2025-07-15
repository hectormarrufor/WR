// models/inventario/Consumible.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');


const Consumible = sequelize.define('Consumible', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  unidadMedida: { // Ej. "Unidad", "Litro", "Metro", "Kg"
    type: DataTypes.STRING,
    allowNull: false,
  },
  stockActual: { // <-- Nuevo campo para el control de inventario
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  stockMinimo: { // Para alertas de bajo stock
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
  },
  precioUnitarioPromedio: { // Opcional: Para valoración de inventario
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
  },
  ubicacionAlmacen: { // Ej. "Estante A1", "Caja 5"
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'Consumibles',
  timestamps: true,
});

Consumible.associate = (models) => {
  Consumible.hasMany(models.ConsumibleUsado, { foreignKey: 'consumibleId', as: 'consumiblesUsados' });
  Consumible.hasMany(models.DetalleOrdenCompra, { foreignKey: 'consumibleId', as: 'detallesOrdenCompra' });
  Consumible.hasMany(models.EntradaInventario, { foreignKey: 'consumibleId', as: 'entradas' });
  Consumible.hasMany(models.SalidaInventario, { foreignKey: 'consumibleId', as: 'salidas' });
  Consumible.hasMany(models.TrabajoExtra, { foreignKey: 'consumibleId', as: 'trabajosExtraAsociados' });
};

module.exports = Consumible;
