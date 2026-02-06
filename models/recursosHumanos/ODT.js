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
        allowNull: true,
    },
    horaSalida: {
        type: DataTypes.TIME,
        allowNull: true,
    },
    salidaActivosBase: {
        type: DataTypes.TIME,
        allowNull: true,
    },
    llegadaActivosBase: {
        type: DataTypes.TIME,
        allowNull: true,
    },
    // Nuevos campos para el personal
    choferEntradaBase: {
        type: DataTypes.TIME,
        allowNull: true, // Permitir nulo para aplicar tu lógica de "asumir"
    },
    choferSalidaBase: {
        type: DataTypes.TIME,
        allowNull: true,
    },
    ayudanteEntradaBase: {
        type: DataTypes.TIME,
        allowNull: true,
    },
    ayudanteSalidaBase: {
        type: DataTypes.TIME,
        allowNull: true,
    },
});

// 🚛 Relación muchos-a-muchos con Activo (vehículos)

ODT.associate = (models) => {
    ODT.belongsTo(models.Activo, { foreignKey: 'vehiculoPrincipalId', as: 'vehiculoPrincipal' });
    ODT.belongsTo(models.Activo, { foreignKey: 'vehiculoRemolqueId', as: 'vehiculoRemolque' });
    ODT.belongsTo(models.Activo, { foreignKey: 'maquinariaId', as: 'maquinaria' });
    ODT.belongsTo(models.Empleado, { foreignKey: 'choferId', as: 'chofer' });
    ODT.belongsTo(models.Empleado, { foreignKey: 'ayudanteId', as: 'ayudante' });
    ODT.belongsTo(models.Cliente, { as: "cliente", foreignKey: "clienteId" });
    ODT.belongsTo(models.User, { foreignKey: 'creadoPorId', as: 'creadoPor' });
    ODT.hasMany(models.HorasTrabajadas, { foreignKey: "odtId", onDelete: 'CASCADE' });
    ODT.hasMany(models.Horometro, { foreignKey: "odtId", onDelete: 'CASCADE' });


}



module.exports = ODT;
