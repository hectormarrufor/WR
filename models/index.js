// index.js (o flota/index.js si solo manejarás los de flota aquí)
const sequelize = require('../sequelize'); // Ajusta esta ruta a tu instancia de sequelize

// --- Importar todos tus modelos ---
// Ajusta las rutas según tu estructura real
const User = require('./user');
const TipoVehiculo = require('./flota/tipoVehiculo');
const MedidaNeumatico = require('./flota/medidaNeumatico');
const TipoAceiteCaja = require('./flota/tipoAceiteCaja');
const TipoAceiteMotor = require('./flota/tipoAceiteMotor');
const TipoBombillo = require('./flota/tipoBombillo');
const Vehiculo = require('./flota/vehiculo');
const Consumible = require('./flota/consumible');
const ConsumibleUsado = require('./flota/consumibleUsado');
const EstadoSistemaVehiculo = require('./flota/estadoSistemaVehiculo');
const FichaTecnica = require('./flota/fichaTecnica');
const HallazgoInspeccion = require('./flota/hallazgoInspeccion');
const Inspeccion = require('./flota/inspeccion');
const Kilometraje = require('./flota/kilometraje');
const Horometro = require('./flota/horometro');
const Mantenimiento = require('./flota/mantenimiento');
const Parte = require('./flota/parte');
const ParteUsada = require('./flota/parteUsada');
const TareaMantenimiento = require('./flota/tareaMantenimiento');


// --- Crear un objeto 'db' (o ') para agruparlos ---
// Las claves deben coincidir con el 'modelName' de cada modelo
const db = {
    User,
    TipoVehiculo,
    MedidaNeumatico,
    TipoAceiteCaja,
    TipoAceiteMotor,
    TipoBombillo,
    Vehiculo,
    Consumible,
    ConsumibleUsado,
    EstadoSistemaVehiculo,
    FichaTecnica,
    HallazgoInspeccion,
    Inspeccion,
    Kilometraje,
    Horometro,
    Mantenimiento,
    Parte,
    ParteUsada,
    TareaMantenimiento,
};

// --- Llamar al método 'associate' de cada modelo ---
Object.values(db).forEach(model => {
    if (typeof model.associate === 'function') {
        model.associate(db); // Pasa el objeto 'db' completo con todos los modelos
    }
});

db.sequelize = sequelize; // Exporta también la instancia de sequelize si es necesario
db.Sequelize = require('sequelize'); // Exporta la clase Sequelize

module.exports = db; // Exporta el objeto 'db' con todos los modelos asociados