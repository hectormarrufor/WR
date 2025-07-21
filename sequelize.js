// sequelize.js
const pg = require('pg');
const { Sequelize } = require('sequelize');
require('dotenv').config();
const sequelize = new Sequelize(
  process.env.NODE_ENVIRONMENT === "DEVELOPMENT" ? process.env.DB_URI_LOCAL : process.env.DB_URI,
  {
    dialect: 'postgres',
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