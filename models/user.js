const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('administracion', 'almacen', 'ventas', 'compras', 'contabilidad', 'gerencia', "seguridad", "calidad", "admin"),
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
  },
}
  // , {
  // hooks: {
  //   beforeSave: async (client) => {
  //     if (client.changed('password')) {
  //       console.log("acabo de proceder a guardar la contrase;a hasheada")
  //       console.log(client.password)
  //       client.password = await bcrypt.hash(client.password, parseInt(process.env.SALT_ROUNDS));
  //       console.log(client.password)
  //     }
  //   },
  // },
  // instanceMethods: {
  //   async comparePassword(password) {
  //     console.log("passssssssssssssword", password)
  //     return bcrypt.compare(password, this.password);
  //   },
  // },
  // defaultScope: {
  //   attributes: { exclude: ['password'] },
  // },
  // }
);

User.prototype.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password)
};

User.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = User;