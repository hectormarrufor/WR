import db from "@/models";


export const recalcularOverheadGlobal = async (t, horasAnterioresForzadas, overheadAnteriorForzado) => {
    try {
        const config = await db.ConfiguracionGlobal.findByPk(1, {
            include: [{ model: db.GastoFijoGlobal, as: 'gastosFijos' }],
            transaction: t
        });

        if (!config) return null;

        // 📸 FOTO DEL ANTES
        const horasAnteriores = typeof horasAnterioresForzadas !== 'undefined' 
                                ? horasAnterioresForzadas 
                                : (parseInt(config.horasTotalesFlota) || 0);
                                
        const overheadAnterior = typeof overheadAnteriorForzado !== 'undefined' 
                                 ? overheadAnteriorForzado 
                                 : (parseFloat(config.costoAdministrativoPorHora) || 0);

        // ==========================================================
        // CÁLCULO DE GASTOS (CON NÓMINA ADMIN + OPERATIVA)
        // ==========================================================
        const gastosFijos = config.gastosFijos || [];
        const anualDinamico = gastosFijos.reduce((sum, g) => sum + (parseFloat(g.montoAnual) || 0), 0);
        
        const mensualEstaticoBase = (parseFloat(config.gastosOficinaMensual) || 0) + (parseFloat(config.pagosGestoriaPermisos) || 0);
        const cantVigilantes = parseInt(config.cantidadVigilantes) || 0;
        const sueldoVigilante = parseFloat(config.sueldoMensualVigilante) || 0;
        const mensualResguardo = (cantVigilantes * sueldoVigilante) + (parseFloat(config.costoSistemaCCTV) || 0) + (parseFloat(config.costoMonitoreoSatelital) || 0);

        // 🔥 AQUÍ ESTABA MI ERROR: Ya sumamos ambas nóminas 🔥
        const nominaAdmin = parseFloat(config.nominaAdministrativaTotal) || 0;
        const nominaOpe = parseFloat(config.nominaOperativaFijaTotal) || 0;
        
        const mensualEstaticoTotal = mensualEstaticoBase + mensualResguardo + nominaAdmin + nominaOpe; 
        const anualEstatico = mensualEstaticoTotal * 12;
        const granTotalAnual = anualEstatico + anualDinamico;

        // 🔥 RECALCULAR HORAS 
        const todosLosActivos = await db.Activo.findAll({
            attributes: ['horasAnuales', 'valorReposicion'],
            transaction: t
        });

        let horasNuevas = 0;
        let valorFlotaTotalReal = 0;

        todosLosActivos.forEach(activo => {
            horasNuevas += parseInt(activo.horasAnuales) || 0;
            valorFlotaTotalReal += parseFloat(activo.valorReposicion) || 0;
        });

        // 📸 FOTO DEL DESPUÉS
        const overheadNuevoCrudo = horasNuevas > 0 ? (granTotalAnual / horasNuevas) : 0;

        const overheadAnteriorAjustado = Number(overheadAnterior.toFixed(2));
        const overheadNuevoAjustado = Number(overheadNuevoCrudo.toFixed(2));

        // Guardar la nueva realidad
        await config.update({
            gastosFijosAnualesTotales: granTotalAnual,
            horasTotalesFlota: horasNuevas,
            valorFlotaTotal: valorFlotaTotalReal,
            costoAdministrativoPorHora: overheadNuevoCrudo
        }, { transaction: t });

        // 🚀 EVALUAR SI HUBO CAMBIOS REALES
        if (horasAnteriores !== horasNuevas || overheadAnteriorAjustado !== overheadNuevoAjustado) {
            return {
                huboCambio: true,
                horasAnteriores,
                horasNuevas,
                overheadAnterior: overheadAnteriorAjustado,
                overheadNuevo: overheadNuevoAjustado
            };
        }

        return { huboCambio: false };

    } catch (error) {
        console.error("Error recalculando el overhead:", error);
        return null;
    }
};