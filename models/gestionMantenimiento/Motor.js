// app/models/gestionMantenimiento/MotorTemplate.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const MotorTemplate = sequelize.define('MotorTemplate', {
 marca: { type: DataTypes.STRING, allowNull: false },
  modelo: { type: DataTypes.STRING, allowNull: false },
  numeroCilindros: { type: DataTypes.INTEGER, allowNull: false },
  aceiteTipo: { type: DataTypes.ENUM('mineral','semi','sintético'), allowNull: false },
  aceiteViscosidad: { type: DataTypes.STRING, allowNull: false }, // ej. 15W40
  aceiteLitros: { type: DataTypes.FLOAT, allowNull: false } // capacidad recomendada



}, {
    tableName: 'MotorTemplates',
    timestamps: true,
});

A
module.exports = MotorTemplate;