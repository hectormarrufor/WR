import { Sequelize } from 'sequelize';

let sequelize;

// Configuración común de Aiven (requiere SSL)
const commonConfig = {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 2,         // Reducido a 2 para evitar saturar las 25 conexiones de Aiven
    min: 0,
    acquire: 30000,
    idle: 5000      // Cerramos conexiones más rápido para liberar espacio en el plan gratuito
  },
  logging: false    // Limpia la consola de queries SQL (opcional)
};

if (process.env.NODE_ENV === 'production') {
  sequelize = new Sequelize(process.env.DATABASE_URL, commonConfig);
} else {
  // Patrón Singleton para evitar fugas de conexiones en desarrollo
  if (!global.sequelize) {
    global.sequelize = new Sequelize(process.env.DATABASE_URL, commonConfig);
  }
  sequelize = global.sequelize;
}

export default sequelize;