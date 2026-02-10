// models/CostEstimate.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');
const CostEstimate = sequelize.define("CostEstimate", {
    name: DataTypes.STRING,
    chutoKm: DataTypes.FLOAT,
    lowboyKm: DataTypes.FLOAT,
    vacuumHr: DataTypes.FLOAT,
    montacargaHr: DataTypes.FLOAT,
    resguardoHr: DataTypes.FLOAT,
    totalCost: DataTypes.FLOAT,
    breakdown: DataTypes.JSON // para guardar el desglose completo
});
module.exports = CostEstimate;

CostEstimate.associate = (models) => {
    CostEstimate.belongsTo(models.Flete, { foreignKey: 'fleteId' });
}
