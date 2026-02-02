// sequelize.js
const pg = require('pg');
const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;
const commonConfig = {
  
    dialect: 'postgres',
    timezone: '-04:00', // Forzamos la zona horaria de escritura a Venezuela
    logging: false,
    dialectOptions: {
      // 2. Le decimos al driver de Postgres que use la hora local al leer
      useUTC: false, 
      dateStrings: true,
      typeCast: true,
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
    // 3. EL TRUCO MAESTRO: Hook de conexión
    hooks: {
      afterConnect: async (connection) => {
        // Cada vez que se conecte, le dice a Postgres: "Estamos en Venezuela"
        // Si tienes datos viejos en UTC, Postgres los convertirá automáticamente al leerlos.
        await connection.query("SET TIME ZONE 'America/Caracas';");
      }
    },
    define: {
      timestamps: true, // Activa createdAt/updatedAt
      hooks: {
        beforeCreate: (record) => {
          // En lugar de una fecha JS, inyectamos el comando SQL 'CURRENT_TIMESTAMP'
          // Esto obliga a usar la hora de Postgres (que ya está en VET)
          record.dataValues.createdAt = sequelize.literal("CURRENT_TIMESTAMP");
          record.dataValues.updatedAt = sequelize.literal("CURRENT_TIMESTAMP");
        },
        beforeUpdate: (record) => {
          record.dataValues.updatedAt = sequelize.literal("CURRENT_TIMESTAMP");
        }
      }
  }
}
;

if (process.env.NODE_ENV === 'production') {
  sequelize = new Sequelize(process.env.DB_URI, commonConfig);
} else {
  // Patrón Singleton para evitar fugas de conexiones en desarrollo
  if (!global.sequelize) {
    global.sequelize = new Sequelize(process.env.DB_URI, {...commonConfig, logging: false});
  }
  sequelize = global.sequelize;
}


module.exports = sequelize;