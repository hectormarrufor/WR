const { DataTypes } = require('sequelize');
const sequelize = require('../../sequelize');
const bcrypt = require('bcryptjs');

const TipoAceiteMotor = sequelize.define('TipoAceiteMotor', {
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
})
module.exports = TipoAceiteMotor;