// sync.js
const sequelize = require('./sequelize');
const User = require('./models/user');
const TipoVehiculo = require('./models/tipoVehiculo');
const MedidaNeumatico = require('./models/medidaNeumatico');
const TipoAceiteCaja = require('./models/tipoAceiteCaja');
const TipoAceiteMotor = require('./models/tipoAceiteMotor');
const TipoBombillo = require('./models/tipoBombillo');
const Vehiculo = require('./models/vehiculo');
const Checklist = require('./models/checklist');

sequelize.sync({ force: true }).then(() => {
  console.log('Modelos sincronizados con la base de datos.');
});