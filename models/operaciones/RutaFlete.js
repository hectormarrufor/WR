// models/RutaFlete.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RutaFlete = sequelize.define('RutaFlete', {
    // La magia de PostGIS: Un solo campo binario optimizado
    posicion: { 
      type: DataTypes.GEOMETRY('POINT', 4326), 
      allowNull: false 
    },
    
    velocidad: { type: DataTypes.FLOAT, defaultValue: 0 },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    
    // Metadatos extra útiles
    bateriaGPS: { type: DataTypes.INTEGER }, // % batería del tracker
    evento: { type: DataTypes.STRING }, // 'reporte_tiempo', 'encendido', 'apagado'
  }, {
    indexes: [
      { fields: ['fleteId', 'timestamp'] }, // Para buscar historial rápido
      { fields: ['posicion'], using: 'gist' } // ÍNDICE ESPACIAL (Clave para velocidad)
    ]
  });

  RutaFlete.associate = (models) => {
    RutaFlete.belongsTo(models.Flete, { foreignKey: 'fleteId' });
  };

  return RutaFlete;
};