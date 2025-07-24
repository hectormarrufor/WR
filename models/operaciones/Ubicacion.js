const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Ubicacion = sequelize.define('Ubicacion', {
  id_ubicacion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
}, { tableName: 'Ubicaciones', timestamps: false });

Ubicacion.associate = (models) => {
  Ubicacion.hasMany(models.Activo, { foreignKey: 'id_ubicacion' });
};

module.exports = Ubicacion;