const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');

const Notificacion = sequelize.define('Notificacion', {
  titulo: { type: DataTypes.STRING, allowNull: false },
  mensaje: { type: DataTypes.TEXT, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: true },
  
  // AHORA SON ARREGLOS (Listas de strings)
  // Ejemplo: ["Mantenimiento", "RRHH"]
  departamentosObjetivo: { 
    type: DataTypes.JSON, // Usa JSONB si estás en Postgres puro
    allowNull: true 
  },
  
  // Ejemplo: ["Chofer", "Vigilante"]
  puestosObjetivo: { 
    type: DataTypes.JSON, 
    allowNull: true 
  },
  
  fechaHoraCaracas: { type: DataTypes.STRING, allowNull: true },
  tipo: { type: DataTypes.ENUM('Info', 'Alerta', 'Critico'), defaultValue: 'Info' }
}, {
  tableName: 'Notificaciones'
});

module.exports = Notificacion;