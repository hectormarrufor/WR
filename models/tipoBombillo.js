// models/tipoBombillo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const bcrypt = require('bcryptjs');

const TipoBombillo = sequelize.define('TipoBombillo', {
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
})
module.exports = TipoBombillo;