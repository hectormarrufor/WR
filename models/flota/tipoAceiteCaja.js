const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');
const bcrypt = require('bcryptjs');

const TipoAceiteCaja = sequelize.define('TipoAceiteCaja', {
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
})
module.exports = TipoAceiteCaja;