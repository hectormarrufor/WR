// const db = require("@/models");

// async function recalcularCostosFlota() {
//     const t = await db.sequelize.transaction();
//     try {
//         // 1. OBTENER CONFIGURACIÓN GLOBAL
//         const config = await db.ConfiguracionGlobal.findOne({ where: { id: 1 }, transaction: t });
//         if (!config) throw new Error("Configuración no encontrada");

//         // 2. CALCULAR COSTO RESGUARDO Y ADMIN (OVERHEAD GLOBAL)
//         // Fórmula Manual DADICA: (Costos Fijos Totales / Total Horas Flota)
        
//         // A. Costos de Seguridad Mensual
//         const costoNominaVigilancia = config.cantidadVigilantes * config.sueldoMensualVigilante;
//         const totalSeguridad = costoNominaVigilancia + config.costoSistemaCCTV + config.costoMonitoreoSatelital;

//         // B. Costos Administrativos Mensuales
//         const totalAdmin = config.gastosOficinaMensual + 
//                            config.pagosGestoriaPermisos + 
//                            config.nominaAdministrativaTotal + 
//                            config.nominaOperativaFijaTotal;

//         const GRAN_TOTAL_FIJO_MENSUAL = totalSeguridad + totalAdmin;

//         // C. Horas Totales de la Flota (Capacidad Instalada)
//         // Buscamos cuántos activos están "Activos" para repartir el costo
//         const cantidadActivos = await db.Activo.count({ where: { estado: 'disponible' }, transaction: t });
        
//         // Asumiendo 176 horas al mes por activo (8h * 22d)
//         const horasTotalesFlota = cantidadActivos * 176;

//         // D. Factor Overhead ($/Hora por camión)
//         const factorOverheadHora = horasTotalesFlota > 0 ? (GRAN_TOTAL_FIJO_MENSUAL / horasTotalesFlota) : 0;

//         // 3. CALCULAR POSESIÓN INDIVIDUAL POR ACTIVO
//         const activos = await db.Activo.findAll({ transaction: t });
        
//         for (const activo of activos) {
//             // Fórmula Posesión DADICA:
//             // Depreciación = (Valor - Salvamento) / (VidaUtil * HorasAnuales)
//             // Interés = (Valor * Tasa%) / HorasAnuales
            
//             const valor = activo.valorReposicion || 0;
//             const vida = activo.vidaUtilAnios || 10;
//             const horasAnuales = config.horasAnualesOperativas || 2000;
//             const tasa = (config.tasaInteresAnual || 5) / 100;

//             const depreciacionHora = (valor - (activo.valorSalvamento || 0)) / (vida * horasAnuales);
//             const interesHora = (valor * tasa) / horasAnuales;
            
//             const costoPosesion = depreciacionHora + interesHora;

//             // Actualizar el Activo
//             await activo.update({
//                 costoPosesionHora: costoPosesion,
//                 costoResguardoHora: factorOverheadHora // Este es igual para todos (prorrateo)
//             }, { transaction: t });
//         }

//         await t.commit();
        
//         return {
//             success: true,
//             overheadHora: factorOverheadHora,
//             totalFijoMensual: GRAN_TOTAL_FIJO_MENSUAL,
//             activosActualizados: activos.length
//         };

//     } catch (error) {
//         await t.rollback();
//         throw error;
//     }
// }

// module.exports = recalcularCostosFlota;