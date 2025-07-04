// sync.js
const sequelize = require('./sequelize');
const User = require('./models/user');
const TipoVehiculo = require('./models/tipoVehiculo')

sequelize.sync({ force: true }).then(() => {
  console.log('Modelos sincronizados con la base de datos.');
});