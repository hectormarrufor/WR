const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const ParteInventario = sequelize.define('ParteInventario', {
  id_parte: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre_parte: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  cantidad_disponible: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  punto_reorden: {
    type: DataTypes.INTEGER,
  },
}, {
  tableName: 'PartesInventario',
  timestamps: true,
});

ParteInventario.associate = (models) => {
  ParteInventario.belongsToMany(models.OrdenTrabajo, { through: models.PartesOrdenTrabajo, foreignKey: 'id_parte' });
};

module.exports = ParteInventario;