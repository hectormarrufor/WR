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

// --- Crear un objeto 'db' para agruparlos ---
const db = {
    BcvPrecioHistorico,
    ConfiguracionGeneral,
    Activo,
    Categoria,
    CategoriaGrupos,
    Modelo,
    Grupo,
    Departamento,
    Puesto,
    EmpleadoPuesto,
    User,
    Empleado
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