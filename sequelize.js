// sequelize.js
const pg = require('pg');
const { Sequelize } = require('sequelize');
require('dotenv').config();
const sequelize = new Sequelize(
  process.env.NODE_ENVIRONMENT === "DEVELOPMENT" ? process.env.DB_URI_LOCAL : process.env.DB_URI,
  {
    dialect: 'postgres',
    logging: (msg) => console.log(`[SEQUELIZE SQL]: ${msg}`),
    // logging: false,
    pool: {
      max: 20,       // REDUCE ESTO A 2. En Serverless (Vercel), cada instancia 
      // solo necesita 1 o 2 conexiones.
      min: 0,
      idle: 5000,   // Tiempo corto para liberar la conexión rápido
      evict: 5000,
      acquire: 30000
    },
    dialectOptions: {
      ssl: process.env.NODE_ENVIRONMENT === "DEVELOPMENT" ? false : {
        require: true,
        rejectUnauthorized: false
      }

    },
    dialectModule: pg,
  }
);


module.exports = sequelize;