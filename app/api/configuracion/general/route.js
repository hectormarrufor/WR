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
        
        // A. Gastos Mensuales Fijos (Llevados a anuales)
        const mensualEstatico = (parseFloat(body.gastosOficinaMensual) || 0) + 
                                (parseFloat(body.pagosGestoriaPermisos) || 0) + 
                                (parseFloat(body.nominaAdministrativaTotal) || 0) + 
                                (parseFloat(body.nominaOperativaFijaTotal) || 0);
        const anualEstatico = mensualEstatico * 12;

        // B. Gastos Anuales Dinámicos (La tabla de Permisos, Seguros, etc)
        const gastosFijos = body.gastosFijos || [];
        const anualDinamico = gastosFijos.reduce((sum, g) => sum + (parseFloat(g.montoAnual) || 0), 0);
        
        const granTotalAnual = anualEstatico + anualDinamico;

        // C. Prorrateo por flota operativa
        const totalEquipos = parseInt(body.cantidadMaquinariaPesada || 0) + parseInt(body.cantidadTransportePesado || 0);
        const horasAnualesOperativas = parseInt(body.horasAnualesOperativas || 2000);
        const horasTotalesFlotaAnual = totalEquipos > 0 ? (totalEquipos * horasAnualesOperativas) : 1;

        // ESTE ES EL OVERHEAD OFICIAL QUE SE LE COBRARÁ A CADA FLETE POR HORA
        const costoAdministrativoPorHora = granTotalAnual / horasTotalesFlotaAnual;

        // =================================================================
        // 2. GUARDAR CONFIGURACIÓN Y TABLA DINÁMICA EN DB
        // =================================================================

        await db.ConfiguracionGlobal.update({
            ...body,
            costoAdministrativoPorHora: costoAdministrativoPorHora
        }, { where: { id: 1 }, transaction: t });

        // Limpiar y recrear gastos fijos extra
        await db.GastoFijoGlobal.destroy({ where: { configuracionId: 1 }, transaction: t });
        if (gastosFijos.length > 0) {
            const nuevosGastos = gastosFijos.map(g => ({
                descripcion: g.descripcion,
                montoAnual: g.montoAnual,
                configuracionId: 1
            }));
            await db.GastoFijoGlobal.bulkCreate(nuevosGastos, { transaction: t });
        }

        // =================================================================
        // 3. ACTUALIZACIÓN EN LOTE DE LAS MATRICES (INSUMOS)
        // =================================================================

        // Actualizar Aceite Motor
        await db.DetalleMatrizCosto.update(
            { costoUnitario: body.precioAceiteMotor },
            { where: { descripcion: { [Op.iLike]: '%Aceite Motor%' } }, transaction: t }
        );

        // Actualizar Cauchos Chuto (Solo para Vehículos)
        await db.DetalleMatrizCosto.update(
            { costoUnitario: body.precioCauchoChuto },
            {
                where: {
                    [Op.and]: [
                        { descripcion: { [Op.or]: [{ [Op.iLike]: '%Neum%' }, { [Op.iLike]: '%Cauch%' }] } },
                        { matrizId: { [Op.in]: db.sequelize.literal(`(SELECT id FROM "MatrizCostos" WHERE "tipoActivo" = 'Vehiculo')`) } }
                    ]
                }, transaction: t
            }
        );

        // Actualizar Cauchos Batea (Solo para Remolques)
        await db.DetalleMatrizCosto.update(
            { costoUnitario: body.precioCauchoBatea },
            {
                where: {
                    [Op.and]: [
                        { descripcion: { [Op.or]: [{ [Op.iLike]: '%Neum%' }, { [Op.iLike]: '%Cauch%' }] } },
                        { matrizId: { [Op.in]: db.sequelize.literal(`(SELECT id FROM "MatrizCostos" WHERE "tipoActivo" = 'Remolque')`) } }
                    ]
                }, transaction: t
            }
        );

        // RECALCULAR LOS TOTALES ($/Km y $/Hr) DE CADA MATRIZ
        const matrices = await db.MatrizCosto.findAll({ include: ['detalles'], transaction: t });
        
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
                        // 166.66 hrs es el estandar laboral de un mes (2000hrs / 12)
                        nuevoTotalHora += (costoFila / (d.frecuencia * 166.66)); 
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