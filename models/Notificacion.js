const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');


const Notificacion = sequelize.define('Notificacion', {


},
{
  tableName: 'Notificaciones',
  timestamps: true, // createdAt, updatedAt
}
);



module.exports = Notificacion;