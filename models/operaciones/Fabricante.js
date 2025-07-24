const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Fabricante = sequelize.define('Fabricante', {
  id_fabricante: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
}, { tableName: 'Fabricantes', timestamps: false });

Fabricante.associate = (models) => {
  Fabricante.hasMany(models.Activo, { foreignKey: 'id_fabricante' });
};

module.exports = Fabricante;