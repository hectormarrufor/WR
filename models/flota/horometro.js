const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Horometro = sequelize.define(
  'Horometro',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    horas: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fecha: {
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
    tableName: 'Horometros',
    timestamps: true,
  }
);



module.exports = Horometro;