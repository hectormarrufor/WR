const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  user: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  empleadoId: { // ✨ NUEVO CAMPO
    type: DataTypes.INTEGER,
    allowNull: true, // Puede haber usuarios que no son empleados (ej. admin)
    unique: true, // Un empleado solo puede tener un usuario
    references: {
      model: 'Empleados',
      key: 'id'
    }
  }
},
{
    tableName: 'Usuarios',
    timestamps: true,
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

User.associate = (models) => {
  User.belongsTo(models.Empleado, {
    foreignKey: 'empleadoId',
    as: 'empleado' // Un usuario pertenece a un empleado
  });
  User.hasMany(models.Requisicion, {
    foreignKey: 'solicitadoPorId',
    as: 'requisicionesSolicitadas' // Un usuario puede hacer muchas requisiciones
  });
  User.hasMany(models.OrdenMantenimiento, {
    foreignKey: 'creadoPorId',
    as: 'ordenesCreadas' // Un usuario puede crear muchas órdenes de mantenimiento
  });
  User.hasMany(models.ODT, {
    foreignKey: 'creadoPorId',
    as: 'odtsCreadas' // Un usuario puede crear muchas órdenes de trabajo
  });


};


module.exports = User;