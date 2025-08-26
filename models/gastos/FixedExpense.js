// models/FixedExpense.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

  const FixedExpense = sequelize.define("FixedExpense", {
    nombre: DataTypes.STRING,
    categoria: DataTypes.STRING,
    montoMensual: DataTypes.FLOAT,
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    fechaInicio: DataTypes.DATE
  });

    module.exports = FixedExpense;