import { NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';

export async function GET() {
    const [config] = await db.ConfiguracionGlobal.findOrCreate({
        where: { id: 1 },
        include: [{ model: db.GastoFijoGlobal, as: 'gastosFijos' }]
    });
    if (!config.gastosFijos) config.gastosFijos = [];
    return NextResponse.json(config);
}

export async function POST(req) {
    const t = await db.sequelize.transaction();
    try {
        const body = await req.json();
        // =================================================================
        // 1. CÁLCULO DE OVERHEAD (ADMINISTRATIVO)
        // =================================================================

        // A. Sumar los gastos estáticos (Mensuales x 12)
        const mensualEstatico = (parseFloat(body.gastosOficinaMensual) || 0) +
            (parseFloat(body.pagosGestoriaPermisos) || 0) +
            (parseFloat(body.nominaAdministrativaTotal) || 0) +
            (parseFloat(body.nominaOperativaFijaTotal) || 0);
        const anualEstatico = mensualEstatico * 12;

        // B. Sumar los gastos dinámicos
        const gastosFijos = body.gastosFijos || [];
        const anualDinamico = gastosFijos.reduce((sum, g) => sum + (parseFloat(g.montoAnual) || 0), 0);

        // C. El Verdadero Gran Total Anual
        const granTotalAnual = anualEstatico + anualDinamico;

        // D. Prorrateo Global (Solo como referencia, la estimación real será ponderada por activo)
        const totalEquipos = body.cantidadTotalUnidades || 1;
        const porcentajeUtilizacion = (parseFloat(body.utilizacionFlotaPorcentaje) || 100) / 100;
        const flotaActiva = totalEquipos * porcentajeUtilizacion;
        const horasAnualesOperativas = parseInt(body.horasAnualesOperativas || 2000);
        const horasTotalesFlotaAnual = flotaActiva > 0 ? (flotaActiva * horasAnualesOperativas) : 1;
        const costoAdministrativoPorHoraReferencia = granTotalAnual / horasTotalesFlotaAnual;

        // =================================================================
        // 2. GUARDAR CONFIGURACIÓN Y TABLA DINÁMICA EN DB
        // =================================================================

        await db.ConfiguracionGlobal.update({
            ...body,
            gastosFijosAnualesTotales: granTotalAnual, // Guardamos el gran total aquí
            costoAdministrativoPorHora: costoAdministrativoPorHoraReferencia
        }, { where: { id: 1 }, transaction: t });


        // Limpiar y recrear gastos fijos extra
        await db.GastoFijoGlobal.destroy({ where: { configuracionId: 1 }, transaction: t });
        if (body.gastosFijos && body.gastosFijos.length > 0) {
            const nuevosGastos = body.gastosFijos.map(g => ({
                descripcion: g.descripcion,
                montoAnual: g.montoAnual,
                configuracionId: 1
            }));
            await db.GastoFijoGlobal.bulkCreate(nuevosGastos, { transaction: t });
        }

        // =================================================================
        // 3. ACTUALIZACIÓN EN LOTE DE LAS MATRICES (INSUMOS Y RANGOS)
        // =================================================================

        // Función auxiliar que arma el paquete de costos (Min, Max, Promedio)
        const prepararCostos = (min, max) => {
            const costoMin = parseFloat(min) || 0;
            const costoMax = parseFloat(max) || 0;
            return {
                costoMinimo: costoMin,
                costoMaximo: costoMax,
                costoUnitario: (costoMin + costoMax) / 2
            };
        };

        // --- Actualizar Cauchos (Universal para toda la flota) ---
        if (body.precioCauchoMin > 0 && body.precioCauchoMax > 0) {
            await db.DetalleMatrizCosto.update(
                prepararCostos(body.precioCauchoMin, body.precioCauchoMax),
                {
                    where: {
                        descripcion: {
                            [Op.or]: [
                                { [Op.iLike]: '%Neum%' },
                                { [Op.iLike]: '%Cauch%' }
                            ]
                        }
                    },
                    transaction: t
                }
            );
        }

        // --- Actualizar Aceite Motor ---
        if (body.precioAceiteMotorMin > 0 && body.precioAceiteMotorMax > 0) {
            await db.DetalleMatrizCosto.update(
                prepararCostos(body.precioAceiteMotorMin, body.precioAceiteMotorMax),
                { where: { descripcion: { [Op.iLike]: '%Aceite Motor%' } }, transaction: t }
            );
        }

        // --- Actualizar Aceite Caja ---
        if (body.precioAceiteCajaMin > 0 && body.precioAceiteCajaMax > 0) {
            await db.DetalleMatrizCosto.update(
                prepararCostos(body.precioAceiteCajaMin, body.precioAceiteCajaMax),
                { where: { descripcion: { [Op.iLike]: '%Aceite Caja%' } }, transaction: t }
            );
        }

        // --- Actualizar Baterías ---
        if (body.precioBateriaMin > 0 && body.precioBateriaMax > 0) {
            await db.DetalleMatrizCosto.update(
                prepararCostos(body.precioBateriaMin, body.precioBateriaMax),
                { where: { descripcion: { [Op.iLike]: '%Bater%' } }, transaction: t }
            );
        }

        // =================================================================
        // 4. RECALCULAR LOS TOTALES ($/Km y $/Hr) DE CADA MATRIZ
        // =================================================================
        const matrices = await db.MatrizCosto.findAll({ include: ['detalles'], transaction: t });

        // 🔥 CONVERTIMOS LAS HORAS ANUALES (DINÁMICAS) A MENSUALES PARA EL DESGASTE 🔥
        const horasOperativasMensuales = horasAnualesOperativas / 12;

        for (const m of matrices) {
            let nuevoTotalKm = 0;
            let nuevoTotalHora = 0;

            for (const d of m.detalles) {
                if (d.frecuencia > 0) {
                    const costoFila = d.cantidad * d.costoUnitario;
                    if (d.tipoDesgaste === 'km') {
                        nuevoTotalKm += (costoFila / d.frecuencia);
                    } else if (d.tipoDesgaste === 'horas') {
                        nuevoTotalHora += (costoFila / d.frecuencia);
                    } else if (d.tipoDesgaste === 'meses') {
                        // AQUÍ ENTRA EN ACCIÓN LA VARIABLE DINÁMICA:
                        nuevoTotalHora += (costoFila / (d.frecuencia * horasOperativasMensuales));
                    }
                }
            }
            await m.update({ totalCostoKm: nuevoTotalKm, totalCostoHora: nuevoTotalHora }, { transaction: t });
        }
        await t.commit();

        return NextResponse.json({
            success: true,
            overheadCalculado: costoAdministrativoPorHora.toFixed(2),
            mensaje: "Configuración global guardada y Matrices re-calculadas exitosamente."
        });

    } catch (error) {
        await t.rollback();
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}