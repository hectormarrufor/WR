// models/CostParameters.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');


const CostParameters = sequelize.define("CostParameters", {
    fuelPrice: DataTypes.FLOAT,
    operatorRate: DataTypes.FLOAT,
    resguardoRate: DataTypes.FLOAT,
    posesionRate: DataTypes.FLOAT,
    manoObraFija: DataTypes.FLOAT,
    manoObraVariable: DataTypes.FLOAT,
    mantenimientoMensual: DataTypes.FLOAT,
    administrativosMensual: DataTypes.FLOAT
});

module.exports = CostParameters;
