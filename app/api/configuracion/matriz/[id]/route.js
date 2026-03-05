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
        // 🔥 3. IMPACTO EN ACTIVOS: RECALCULAR Y GENERAR REPORTE 🔥
        // ==========================================================
        const reporteImpacto = [];

        // Buscamos la tasa de interés global
        const config = await db.ConfiguracionGlobal.findByPk(1, { transaction: t });
        const tasaInteresDecimal = (config ? parseFloat(config.tasaInteresAnual || 5.0) : 5.0) / 100;

        // Buscamos todos los activos que usan esta matriz
        const activos = await db.Activo.findAll({ where: { matrizCostoId: id }, transaction: t });

        for (const activo of activos) {
            // "Foto" del antes
            const costoKmViejo = parseFloat(activo.costoMantenimientoTeorico || 0);
            const costoHoraViejo = parseFloat(activo.costoPosesionHora || 0);

            // Recalcular la depreciación pura del equipo
            const valor = parseFloat(activo.valorReposicion) || 0;
            const salvamento = parseFloat(activo.valorSalvamento) || 0;
            const vida = parseInt(activo.vidaUtilAnios) || 1;
            const horasAnuales = parseInt(activo.horasAnuales) || 2000;

            const montoADepreciar = valor - salvamento;
            const vidaEnHoras = vida * horasAnuales;
            const depHora = vidaEnHoras > 0 ? (montoADepreciar / vidaEnHoras) : 0;
            const intHora = horasAnuales > 0 ? ((valor * tasaInteresDecimal) / horasAnuales) : 0;

            const costoPosesionEquipoHora = depHora + intHora;

            // "Foto" del después (Depreciación pura + Nuevos totales de la Matriz)
            const nuevoCostoFijoHora = costoPosesionEquipoHora + parseFloat(body.totalCostoHora || 0);
            const nuevoCostoVariableKm = parseFloat(body.totalCostoKm || 0);

            // Guardamos la actualización en el Activo
            await activo.update({
                costoMantenimientoTeorico: nuevoCostoVariableKm,
                costoPosesionTeorico: nuevoCostoFijoHora,
                costoPosesionHora: nuevoCostoFijoHora
            }, { transaction: t, hooks: false }); // hooks: false evita bucles infinitos

            // Si cambiaron los números, lo metemos en el reporte
            if (costoKmViejo !== nuevoCostoVariableKm || costoHoraViejo !== nuevoCostoFijoHora) {
                reporteImpacto.push({
                    codigoInterno: activo.codigoInterno,
                    tipo: activo.tipoActivo,
                    oldKm: costoKmViejo,
                    newKm: nuevoCostoVariableKm,
                    oldHora: costoHoraViejo,
                    newHora: nuevoCostoFijoHora
                });
            }
        }

        await t.commit();
        
        // Retornamos todo al frontend
        return NextResponse.json({ success: true, reporteImpacto });
    } catch (e) {
        await t.rollback();
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