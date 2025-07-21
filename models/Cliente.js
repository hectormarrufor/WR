// models/Cliente.js
const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Cliente = sequelize.define('Cliente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  rif: { // RIF
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  razonSocial: { // Nombre de la empresa o persona jurídica
    type: DataTypes.STRING,
    allowNull: true, // Puede ser nulo si es persona natural
  },
  nombreContacto: { // Nombre de la persona de contacto si es empresa
    type: DataTypes.STRING,
    allowNull: true,
  },
  apellidoContacto: { // Apellido de la persona de contacto si es empresa
    type: DataTypes.STRING,
    allowNull: true,
  },
  nombreCompleto: { // Para personas naturales o un campo combinado para búsqueda
    type: DataTypes.VIRTUAL,
    get() {
      return `${this.nombreContacto || ''} ${this.apellidoContacto || ''}`.trim();
    },
    set(value) {
      throw new Error('Do not try to set the `nombreCompleto` value!');
    }
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
    type: DataTypes.TEXT,
    allowNull: true,
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'Clientes',
  timestamps: true, // createdAt, updatedAt
});

// Este `associate` se llamará desde `models/index.js`
Cliente.associate = (models) => {
  Cliente.hasMany(models.ContratoServicio, { foreignKey: 'clienteId', as: 'contratos' });
  Cliente.hasMany(models.Factura, { foreignKey: 'clienteId', as: 'facturas' });
};

module.exports = Cliente;