const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Kilometraje = sequelize.define(
  'Kilometraje',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    kilometrajeActual: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fechaRegistro: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    vehiculoId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Vehiculos',
        key: 'id',
      },
      allowNull: false,
    },

  },
  {
    tableName: 'Kilometrajes',
    timestamps: true,
  }
);



module.exports = Kilometraje;