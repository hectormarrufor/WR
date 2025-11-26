const sequelize = require("../../sequelize");
const { DataTypes } = require( "sequelize");

const ODT_Vehiculos = sequelize.define("ODT_Vehiculos", {
  tipo: {
    type: DataTypes.ENUM("principal", "remolque"),
    allowNull: false,
  },
});

module.exports = ODT_Vehiculos