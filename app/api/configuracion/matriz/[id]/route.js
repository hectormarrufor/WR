import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(req, { params }) {
    const { id } = await params; // ID de la matriz a obtener
    const matriz = await db.MatrizCosto.findByPk(id, {
        include: [{ model: db.DetalleMatrizCosto, as: 'detalles' }]
    });
    return NextResponse.json({ header: matriz, detalles: matriz.detalles });
}

export async function PUT(req, { params }) {
    const body = await req.json();
    const t = await db.sequelize.transaction();

    // 👇 ¡ESTA LÍNEA ES LA QUE FALTABA! 👇
    const { id } = await params;

    try {
        // 1. Actualizar Header con el nuevo total
        await db.MatrizCosto.update(
            {
                totalCostoKm: body.totalCostoKm,
                totalCostoHora: body.totalCostoHora,
                costoPosesionHora: body.costoPosesionHora
            },
            { where: { id: id }, transaction: t }
        );

        // 2. Reemplazar detalles (Estrategia simple: Borrar y Crear)
        await db.DetalleMatrizCosto.destroy({ where: { matrizId: id }, transaction: t });

        // Limpiamos los IDs viejos para que Sequelize no se confunda al recrear
        const nuevosDetalles = body.detalles.map(d => {
            const { id: oldId, createdAt, updatedAt, ...rest } = d;
            return {
                ...rest,
                matrizId: id
            };
        });

        await db.DetalleMatrizCosto.bulkCreate(nuevosDetalles, { transaction: t });

     // ==========================================================
        // 🔥 3. IMPACTO EN ACTIVOS: RECALCULO DE CONCEPTOS SEPARADOS
        // ==========================================================
        const reporteImpacto = [];
        const config = await db.ConfiguracionGlobal.findByPk(1, { transaction: t });
        const tasaInteresDecimal = (config ? parseFloat(config.tasaInteresAnual || 5.0) : 5.0) / 100;

        const activos = await db.Activo.findAll({ where: { matrizCostoId: id }, transaction: t });

        for (const activo of activos) {
            const costoKmViejo = parseFloat(activo.costoMantenimientoTeorico || 0);
            const costoHoraViejo = parseFloat(activo.costoPosesionHora || 0);

            // --- CÁLCULO 1: POSESIÓN FINANCIERA PURA (Depreciación + Interés) ---
            const valor = parseFloat(activo.valorReposicion);
            const salvamento = parseFloat(activo.valorSalvamento);
            const vida = parseInt(activo.vidaUtilAnios);
            const horasAnuales = parseInt(activo.horasAnuales); // Según tu data real

            const montoADepreciar = valor - salvamento;
            const vidaEnHoras = vida * horasAnuales;
            const depHora = vidaEnHoras > 0 ? (montoADepreciar / vidaEnHoras) : 0;
            const intHora = horasAnuales > 0 ? ((valor * tasaInteresDecimal) / horasAnuales) : 0;

            const costoPosesionFinancieraHora = depHora + intHora;

            console.log(`Activo ${activo.codigoInterno}: DepHora=${depHora.toFixed(2)}, IntHora=${intHora.toFixed(2)}, TotalPosesionHora=${costoPosesionFinancieraHora.toFixed(2)}`);
            console.log(`Activo ${activo.codigoInterno}: CostoMantenimientoKm Viejo=${costoKmViejo.toFixed(2)}, Nuevo=${body.totalCostoKm}`);
            console.log(`Activo ${activo.codigoInterno}: CostoPosesionHora Viejo=${costoHoraViejo.toFixed(2)}, Nuevo=${costoPosesionFinancieraHora.toFixed(2)}`);
            console.log("valor, salvamento y horas anules: ", valor, salvamento, horasAnuales);
            console.log("Tasa de interés anual y decimal: ", config.tasaInteresAnual, tasaInteresDecimal);
            console.log("Vida en horas: ", vidaEnHoras);
            console.log("Monto a depreciar: ", montoADepreciar);
            console.log("vida en años: ", vida);

            // --- CÁLCULO 2: MANTENIMIENTO (Viene de la Matriz nueva) ---
            const nuevoMantenimientoVariableKm = parseFloat(body.totalCostoKm || 0);
            const nuevoMantenimientoFijoHora = parseFloat(body.totalCostoHora || 0);

            // 🔥 ACTUALIZACIÓN SIN MEZCLAR CONCEPTOS 🔥
            await activo.update({
                // Lo que se gasta por KM (Cauchos, Aceite)
                costoMantenimientoTeorico: nuevoMantenimientoVariableKm, 
                
                // Lo que se gasta por HORA de mantenimiento (Seguros, Patas)
                costoPosesionTeorico: nuevoMantenimientoFijoHora, 
                
                // Lo que cuesta el DINERO y el HIERRO (Posesión pura)
                costoPosesionHora: costoPosesionFinancieraHora 
            }, { transaction: t, hooks: false });

            if (costoKmViejo !== nuevoMantenimientoVariableKm || costoHoraViejo !== costoPosesionFinancieraHora) {
                reporteImpacto.push({
                    codigoInterno: activo.codigoInterno,
                    oldKm: costoKmViejo,
                    newKm: nuevoMantenimientoVariableKm,
                    oldHora: costoHoraViejo,
                    newHora: costoPosesionFinancieraHora
                });
            }
        }

        await t.commit();
        return NextResponse.json({ success: true, reporteImpacto });
    } catch (e) {
        if (t) await t.rollback();
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;

        // Destruye la matriz (y el CASCADE destruirá sus detalles automáticamente)
        await db.MatrizCosto.destroy({ where: { id: id } });

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}