import { NextResponse } from 'next/server';
import db from '@/models';
import { Op } from 'sequelize';

export async function GET() {
    // Busca la config o crea una por defecto
    const [config] = await db.ConfiguracionGlobal.findOrCreate({ where: { id: 1 } });
    if (!config) {
        // Valores por defecto de seguridad si no hay DB inicializada
        return NextResponse.json({
            horasAnualesOperativas: 2000,
            tasaInteresAnual: 5.0,
            factorOverheadHora: 0 // Si lo usas
        });
    }
    return NextResponse.json(config);
}

export async function POST(req) {
    const t = await db.sequelize.transaction();
    try {
        const body = await req.json();

        // 1. Guardar Configuración Global
        await db.ConfiguracionGlobal.update(body, { where: { id: 1 }, transaction: t });

        // =================================================================
        // 2. EJECUTAR LÓGICA MANUAL DADICA (CÁLCULOS)
        // =================================================================

        // --- A. CÁLCULO DE RESGUARDO ($/Hr) ---
        // Fórmula del Manual: Costo Total Vigilancia / Horas Operativas Flota
        const costoNominaVigilancia = body.cantidadVigilantes * body.sueldoMensualVigilante;
        const costoTotalSeguridadMes = costoNominaVigilancia + parseFloat(body.costoSistemaSeguridad || 0);

        const totalEquipos = parseInt(body.cantidadMaquinariaPesada) + parseInt(body.cantidadTransportePesado);

        // Asumiendo 176 horas operativas al mes promedio por equipo (8h * 22dias)
        const horasTotalesFlota = totalEquipos * 176;

        // FACTOR RESGUARDO ($/Hora)
        const costoResguardoHora = horasTotalesFlota > 0 ? (costoTotalSeguridadMes / horasTotalesFlota) : 0;


        // --- B. ACTUALIZAR PRECIOS EN MATRICES (INSUMOS) ---
        // Buscamos en los detalles de las matrices y actualizamos precios según lo que configuraste

        // Actualizar Aceite Motor
        await db.DetalleMatrizCosto.update(
            { costoUnitario: body.precioAceiteMotor },
            { where: { descripcion: { [Op.iLike]: '%Aceite Motor%' } }, transaction: t }
        );

        // Actualizar Cauchos Chuto (Direccional/Tracción)
        await db.DetalleMatrizCosto.update(
            { costoUnitario: body.precioCauchoChuto },
            {
                where: {
                    [Op.and]: [
                        { descripcion: { [Op.iLike]: '%Neum%' } }, // Contiene Neumático
                        { matrizId: { [Op.in]: db.sequelize.literal(`(SELECT id FROM "MatrizCostos" WHERE "tipoActivo" = 'Vehiculo')`) } }
                    ]
                }, transaction: t
            }
        );

        // Actualizar Cauchos Batea
        await db.DetalleMatrizCosto.update(
            { costoUnitario: body.precioCauchoBatea },
            {
                where: {
                    [Op.and]: [
                        { descripcion: { [Op.iLike]: '%Neum%' } },
                        { matrizId: { [Op.in]: db.sequelize.literal(`(SELECT id FROM "MatrizCostos" WHERE "tipoActivo" = 'Remolque')`) } }
                    ]
                }, transaction: t
            }
        );

        // --- C. RECALCULAR TOTALES DE MATRICES ---
        // Como cambiamos precios unitarios, hay que sumar todo de nuevo
        const matrices = await db.MatrizCosto.findAll({ include: ['detalles'], transaction: t });

        for (const m of matrices) {
            let nuevoTotalKm = 0;
            for (const d of m.detalles) {
                if (d.frecuenciaKm > 0) {
                    nuevoTotalKm += (d.cantidad * d.costoUnitario) / d.frecuenciaKm;
                }
            }
            // Actualizamos el total y el costo de posesión base (Resguardo no va aquí, va en el flete)
            await m.update({ totalCostoKm: nuevoTotalKm }, { transaction: t });
        }

        await t.commit();

        return NextResponse.json({
            success: true,
            resguardoCalculado: costoResguardoHora.toFixed(2),
            mensaje: "Costos globales y precios de mercado actualizados."
        });

    } catch (error) {
        await t.rollback();
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}