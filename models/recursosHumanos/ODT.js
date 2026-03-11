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
    estado: {
        type: DataTypes.ENUM('En Curso', 'Finalizada', 'Cancelada'),
        defaultValue: 'En Curso',
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM('En Curso', 'Finalizada', 'Cancelada'),
        defaultValue: 'En Curso',
        allowNull: true
    },
    // 🔥 NUEVOS CAMPOS DEL MAPA Y COTIZADOR 🔥
    distanciaKm: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    cantidadPeajes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    tramos: {
        type: DataTypes.JSON, // Guardamos el array del mapa como JSON
        allowNull: true,
    },
    waypoints: {
        type: DataTypes.JSON, // Guardamos los puntos del mapa
        allowNull: true,
    },
    destino: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    tipoLiquido: {
        type: DataTypes.STRING,
        defaultValue: 'general',
    },
    viajesEstimados: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    // 🔥 CAMPOS FINANCIEROS Y COTIZADOR 🔥
    margenGanancia: {
        type: DataTypes.FLOAT,
        defaultValue: 35, // El 35% por defecto
    },
    costoEstimado: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    precioSugerido: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    desgloseCostos: {
        type: DataTypes.JSON, // (Sequelize lo traduce a JSON o JSONB según tu base de datos)
        allowNull: true,
    }
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
