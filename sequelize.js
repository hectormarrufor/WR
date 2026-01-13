import { Sequelize } from 'sequelize';

// Evitar crear múltiples instancias en desarrollo debido al Hot Reloading
let sequelize;

if (process.env.NODE_ENV === 'production') {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    // LIMITA EL POOL DE CONEXIONES
    pool: {
      max: 5,      // Máximo de conexiones abiertas
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  // En desarrollo usamos una variable global para que no se cree una instancia por cada cambio de código
  if (!global.sequelize) {
    global.sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
  sequelize = global.sequelize;
}

export default sequelize;