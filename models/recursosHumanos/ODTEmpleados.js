const sequelize = require("../../sequelize");
const { DataTypes } = require( "sequelize");

const ODT_Empleados = sequelize.define("ODT_Empleados", {
  rol: {
    type: DataTypes.ENUM("chofer", "ayudante", "operador"),
    allowNull: false,
  },
});

module.exports = ODT_Empleados;



