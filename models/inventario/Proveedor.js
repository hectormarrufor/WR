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
      comment: 'Nombre del proveedor.',
    },
    contacto: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nombre de la persona de contacto en el proveedor.',
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
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
    Proveedor.hasMany(models.OrdenCompra, { foreignKey: 'proveedorId', as: 'ordenesCompra' });
  };

  module.exports = Proveedor;
