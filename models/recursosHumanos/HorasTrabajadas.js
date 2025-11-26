// models/recursosHumanos/HorasTrabajadas.js
const { DataTypes } = require("sequelize");
const Empleado = require("./Empleado.js");
const ODT = require("./ODT.js");
const sequelize = require("../../sequelize");

const HorasTrabajadas = sequelize.define("HorasTrabajadas", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    horas: {
        type: DataTypes.FLOAT, // permite decimales (ej: 7.5 horas)
        allowNull: false,
    },
    origen: {
        type: DataTypes.ENUM("manual", "odt"),
        defaultValue: "manual",
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
});

// Relaciones
HorasTrabajadas.associate = (models) => {
    Empleado.hasMany(models.HorasTrabajadas, { foreignKey: "empleadoId" });
    HorasTrabajadas.belongsTo(models.Empleado, { foreignKey: "empleadoId" });
    HorasTrabajadas.belongsTo(models.ODT, { foreignKey: "odtId" });
}

module.exports = HorasTrabajadas;