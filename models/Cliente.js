// models/Cliente.js
const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Cliente = sequelize.define('Cliente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  identificacion: { // RIF, cedula
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  nombre: { // Nombre de la empresa o persona jurídica
    type: DataTypes.STRING,
    allowNull: true, // Puede ser nulo si es persona natural
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
  Cliente.hasMany(models.ODT, { as: "odts", foreignKey: "clienteId" });
};

module.exports = Cliente;