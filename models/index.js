// index.js
const sequelize = require('../sequelize');

// --- Importar todos tus modelos ---
const User = require('./user');

// RECURSOS HUMANOS
const Empleado = require('./recursosHumanos/Empleado');
const Puesto = require('./recursosHumanos/Puesto');
const EmpleadoPuesto = require('./recursosHumanos/EmpleadoPuesto');
const Departamento = require('./recursosHumanos/Departamento'); // <-- AÑADIR NUEVO MODELO

const BcvPrecioHistorico = require('./BcvPrecioHistorico');
const ConfiguracionGeneral = require('./ConfiguracionGeneral');
const Activo = require('./gestionMantenimiento/Activo');
const Categoria = require('./gestionMantenimiento/Categoria');
const CategoriaGrupos = require('./gestionMantenimiento/CategoriaGrupos');
const Modelo = require('./gestionMantenimiento/Modelo');
const Grupo = require('./gestionMantenimiento/Grupo');
const TipoConsumible = require('./inventario/TipoConsumibles');
const Consumible = require('./inventario/Consumible');
const EntradaInventario = require('./inventario/EntradaInventario');
const SalidaInventario = require('./inventario/SalidaInventario');
const Hallazgo = require('./gestionMantenimiento/Hallazgo');
const Mantenimiento = require('./gestionMantenimiento/mantenimiento');
const TareaMantenimiento = require('./gestionMantenimiento/tareaMantenimiento');
const Inspeccion = require('./gestionMantenimiento/Inspeccion');
const Kilometraje = require('./gestionMantenimiento/Kilometraje');
const Horometro = require('./gestionMantenimiento/Horometro');
const Requisicion = require('./inventario/requisicion/Requisicion');
const RequisicionDetalle = require('./inventario/requisicion/RequisicionDetalle');
const Compatibilidad = require('./inventario/Compatibilidad');
const MedidaNeumatico = require('./catalogos/MedidaNeumatico');
const Marca = require('./catalogos/Marca');
const CostParameters = require('./estimacion/CostParameters');
const CostEstimate = require('./estimacion/CostEstimate');
const FixedExpense = require('./gastos/FixedExpense');
const Flete = require('./operaciones/Flete');
const PushSubscription = require('./pushSubscription');
const ConsumibleUsado = require('./inventario/ConsumibleUsado');
const ViscosidadAceite = require('./catalogos/ViscosidadAceite');
const Codigo = require('./catalogos/Codigo');
const ODT = require('./recursosHumanos/ODT');
const ODT_Vehiculos = require('./recursosHumanos/ODTVehiculos');
const Cliente = require('./Cliente');
const HorasTrabajadas = require('./recursosHumanos/HorasTrabajadas');
const ODT_Empleados = require('./recursosHumanos/ODTEmpleados');
const Color = require('./catalogos/Color');


// --- Crear un objeto 'db' para agruparlos ---
const db = {
    BcvPrecioHistorico,
    ConfiguracionGeneral,
    PushSubscription,

    //FLOTA
    Activo,
    Categoria,
    CategoriaGrupos,
    Modelo,
    Grupo,
    Kilometraje,
    Horometro,

    //GESTION MANTENIMIENTO
    Inspeccion,
    Hallazgo,
    Mantenimiento,
    TareaMantenimiento,
    Requisicion,
    RequisicionDetalle,
    Color,

    //RECURSOS HUMANOS
    Departamento,
    Puesto,
    EmpleadoPuesto,
    User,
    Empleado,

    //INVENTARIO
    TipoConsumible,
    Consumible,
    ConsumibleUsado,
    EntradaInventario,
    SalidaInventario,
    Compatibilidad,
    MedidaNeumatico,
    Marca,
    ViscosidadAceite,
    Codigo,

    //ESTIMACION
    CostParameters,
    CostEstimate,

    //Gastos
    FixedExpense,

    //FLETES
    Flete,

    //OPERACIONES
    ODT,
    ODT_Vehiculos,
    ODT_Empleados,
    Cliente,
    HorasTrabajadas,
};

// --- Llamar al método 'associate' de cada modelo ---
Object.values(db).forEach(model => {
    if (typeof model.associate === 'function') {
        model.associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;