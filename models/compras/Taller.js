// models/inventario/Proveedor.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');
const Taller = sequelize.define('Taller', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'Talleres',
  timestamps: true,
});


Taller.associate = (models) => {
    Taller.hasMany(models.Recauchado, { foreignKey: 'tallerId' });
};



module.exports = Taller;
