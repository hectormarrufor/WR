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
const Consumible = require('./inventario/Consumible');
const CompatibilidadModeloConsumible = require('./inventario/CompatibilidadModeloConsumible');
const EntradaInventario = require('./inventario/EntradaInventario');
const SalidaInventario = require('./inventario/SalidaInventario');
const Inspeccion = require('./gestionMantenimiento/inspeccion');
const Hallazgo = require('./gestionMantenimiento/Hallazgo');
const Mantenimiento = require('./gestionMantenimiento/mantenimiento');
const TareaMantenimiento = require('./gestionMantenimiento/tareaMantenimiento');

// --- Crear un objeto 'db' para agruparlos ---
const db = {
    BcvPrecioHistorico,
    ConfiguracionGeneral,

    //FLOTA
    Activo,
    Categoria,
    CategoriaGrupos,
    Modelo,
    Grupo,

    //GESTION MANTENIMIENTO
    Inspeccion,
    Hallazgo,
    Mantenimiento,
    TareaMantenimiento,

    //RECURSOS HUMANOS
    Departamento,
    Puesto,
    EmpleadoPuesto,
    User,
    Empleado,

    //INVENTARIO
    Consumible,
    CompatibilidadModeloConsumible,
    EntradaInventario,
    SalidaInventario,
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