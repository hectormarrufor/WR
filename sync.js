// sync.js
// Solo necesitas importar el objeto 'db' desde tu index.js central
const db = require('./models'); // Ajusta la ruta si tu index.js está en otro lugar, ej. './models/flota'

db.sequelize.sync({ alter: true }) // Usa la instancia de sequelize del objeto db
    .then(() => {
        console.log('Modelos sincronizados con la base de datos.');
    })
    .catch(error => {
        console.error('Error al sincronizar modelos:', error);
    });