// sync-modelo.js
const db = require('./models'); // Ajusta esta ruta si es necesario

// 🔥 VARIABLE MÁGICA: Escribe aquí el nombre exacto del modelo que quieres actualizar
const nombreModelo = 'GastoVariable'; // Ejemplo: 'Consumible', 'Hallazgo', 'OrdenMantenimiento', etc.

async function sincronizarModeloDinámico() {
    try {
        console.log(`⏳ Buscando el modelo: "${nombreModelo}"...`);

        // 1. Validación de seguridad: Comprobamos si el modelo realmente existe
        if (!db[nombreModelo]) {
            console.error(`❌ ALERTA: El modelo "${nombreModelo}" no existe en tu carpeta de models.`);
            console.log('Modelos disponibles:', Object.keys(db).filter(k => k !== 'sequelize' && k !== 'Sequelize').join(', '));
            return;
        }

        console.log(`🛠️ Iniciando sincronización segura (alter: true) para ${nombreModelo}...`);

        // 2. Ejecución dinámica: Usamos corchetes para llamar al modelo por su nombre en string
        await db[nombreModelo].sync({ alter: true });

        console.log(`✅ ¡Éxito! El modelo ${nombreModelo} ha sido sincronizado con la base de datos.`);

    } catch (error) {
        console.error(`❌ Error crítico durante la sincronización de ${nombreModelo}:`, error);
    } finally {
        // 3. Apagamos la luz al salir
        if (db.sequelize) {
            await db.sequelize.close();
            console.log('🔌 Conexión a la base de datos cerrada de forma segura.');
        }
    }
}

sincronizarModeloDinámico();