// models/ordenesTrabajo/ODT.js
const { DataTypes } = require("sequelize");
const Empleado = require("../recursosHumanos/Empleado.js");
const HorasTrabajadas = require("../recursosHumanos/HorasTrabajadas.js");
const Activo = require("../gestionMantenimiento/Activo.js");
const Cliente = require("../Cliente.js");
const sequelize = require("../../sequelize");

const ODT = sequelize.define("ODT", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    nroODT: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    descripcionServicio: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    horaLlegada: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    horaSalida: {
        type: DataTypes.TIME,
        allowNull: false,
    },
});

// 🚛 Relación muchos-a-muchos con Activo (vehículos)

ODT.associate = (models) => {
    ODT.belongsToMany(models.Activo, {
        through: models.ODT_Vehiculos,
        as: "vehiculos",
        foreignKey: "odtId",
    });
    ODT.belongsToMany(models.Empleado, {
        through: models.ODT_Empleados,
        as: "empleados",
        foreignKey: "odtId",
    });
    ODT.belongsTo(models.Cliente, { as: "cliente", foreignKey: "clienteId" });
    ODT.hasMany(models.HorasTrabajadas, { foreignKey: "odtId" });


}



module.exports = ODT;
