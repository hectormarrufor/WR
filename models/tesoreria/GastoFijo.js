// models/tesoreria/GastoFijo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

  const GastoFijo = sequelize.define("GastoFijo", {
    nombre: DataTypes.STRING,
    categoria: DataTypes.STRING,
    montoMensual: DataTypes.FLOAT,
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    fechaInicio: DataTypes.DATE
  });

  GastoFijo.associate = (models) => {
    GastoFijo.hasMany(models.MovimientoTesoreria, { 
      foreignKey: 'gastoFijoId', 
      as: 'movimientos' 
    });
  }

    module.exports = GastoFijo;