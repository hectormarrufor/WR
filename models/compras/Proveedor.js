// models/inventario/Proveedor.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');
const Proveedor = sequelize.define('Proveedor', {
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
  contacto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rif: { // Registro de Información Fiscal (Venezuela)
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'Proveedores',
  timestamps: true,
});


Proveedor.associate = (models) => {
  Proveedor.hasMany(models.RecepcionCompra, { foreignKey: 'proveedorId' });
  Proveedor.hasMany(models.CuentaTerceros, { foreignKey: 'proveedorId' });
  Proveedor.hasMany(models.PagoMovil, { foreignKey: 'proveedorId' });
};



module.exports = Proveedor;
