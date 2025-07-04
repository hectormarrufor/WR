// sequelize.js
const pg = require('pg');
const { Sequelize } = require('sequelize');
require('dotenv').config();
const sequelize = new Sequelize(
  process.env.DB_URI,
  {
    dialect: 'postgres',
    dialectOptions: {
      // ssl: false,
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    dialectModule: pg,
  }
);


module.exports = sequelize;