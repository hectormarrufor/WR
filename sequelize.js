// sequelize.js
const pg = require('pg');
const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;
const commonConfig = {
  
    dialect: 'postgres',
    timezone: '-04:00', // Ajuste de zona horaria
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 2,       // REDUCE ESTO A 2. En Serverless (Vercel), cada instancia 
      // solo necesita 1 o 2 conexiones.
      min: 0,
      idle: 5000,   // Tiempo corto para liberar la conexión rápido
      evict: 5000,
      acquire: 30000
    },
    dialectModule: pg,
    logging:  true
  }
;

if (process.env.NODE_ENV === 'production') {
  sequelize = new Sequelize(process.env.DB_URI, commonConfig);
} else {
  // Patrón Singleton para evitar fugas de conexiones en desarrollo
  if (!global.sequelize) {
    global.sequelize = new Sequelize(process.env.DB_URI, {...commonConfig, logging: true});
  }
  sequelize = global.sequelize;
}


module.exports = sequelize;