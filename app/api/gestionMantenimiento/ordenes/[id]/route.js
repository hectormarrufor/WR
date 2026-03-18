import { NextResponse } from "next/server";
import db from "@/models";
import { Op } from "sequelize";

export async function PUT(request, { params }) {
    const { id } = params;
    const t = await db.sequelize.transaction();

    try {
        const body = await request.json();
        
        // 1. Buscamos la ODT
        const orden = await db.OrdenMantenimiento.findByPk(id, { transaction: t });
        if (!orden) throw new Error("Orden de Mantenimiento no encontrada");

        // 2. Actualizamos el estado de la ODT (Ej: de 'En Ejecucion' a 'Finalizada')
        await orden.update({
            estado: body.estado !== undefined ? body.estado : orden.estado,
            // Aquí puedes agregar otros campos que actualices de la orden (observaciones, fechaFin, etc.)
        }, { transaction: t });

        // 🔥 3. TRAEMOS EL ACTIVO PARA PASARLO POR EL ESCÁNER MÉDICO 🔥
        const activo = await db.Activo.findByPk(orden.activoId, { transaction: t });

        if (activo) {
            let estadoFinal = activo.estado;

            if (estadoFinal !== 'Desincorporado') {
                
                // A. Mantenimientos abiertos (Usando tu ENUM correcto)
                const ordenesAbiertas = await db.OrdenMantenimiento.count({
                    where: { 
                        activoId: activo.id, 
                        estado: {
                            [Op.in]: ['Diagnostico', 'Esperando Stock', 'Por Ejecutar', 'En Ejecucion']
                        }
                    },
                    transaction: t
                });

                // B. Piezas físicas dañadas
                const subsistemas = await db.SubsistemaInstancia.findAll({ where: { activoId: activo.id }, transaction: t });
                const tienePiezaCritica = subsistemas.some(s => ['roto', 'critico', 'no operativo'].includes(s.estado?.toLowerCase()));
                const tienePiezaLeve = subsistemas.some(s => ['advertencia', 'regular', 'desgaste'].includes(s.estado?.toLowerCase()));

                // C. Hallazgos Pendientes de Inspecciones
                const inspeccionesDelActivo = await db.Inspeccion.findAll({ where: { activoId: activo.id }, attributes: ['id'], transaction: t });
                const inspeccionIds = inspeccionesDelActivo.map(i => i.id);
                
                const hallazgosPendientes = await db.Hallazgo.findAll({
                    where: { inspeccionId: inspeccionIds, estado: 'Pendiente' },
                    transaction: t
                });
                
                const tieneHallazgoCritico = hallazgosPendientes.some(h => h.impacto === 'No Operativo');
                const tieneHallazgoLeve = hallazgosPendientes.some(h => h.impacto === 'Advertencia');

                // 🔥 D. LA NUEVA JERARQUÍA MAESTRA (Físico > Administrativo) 🔥
                if (ordenesAbiertas > 0) {
                    estadoFinal = 'En Mantenimiento';
                } else if (tienePiezaCritica || tieneHallazgoCritico) {
                    estadoFinal = 'No Operativo';
                } else if (activo.horasAnuales === undefined || Number(activo.horasAnuales) <= 0) {
                    // Si ya está sano, PERO tiene 0 horas, el administrador lo bloquea
                    estadoFinal = 'Inactivo';
                } else if (tienePiezaLeve || tieneHallazgoLeve) {
                    estadoFinal = 'Advertencia';
                } else {
                    estadoFinal = 'Operativo'; 
                }
            }

            // 4. Si el estado cambió, lo guardamos en la base de datos
            if (estadoFinal !== activo.estado) {
                await activo.update({ estado: estadoFinal }, { transaction: t });
            }
        }

        await t.commit();
        
        // Refrescamos el activo para devolver el estado real al Frontend
        return NextResponse.json({ 
            success: true, 
            message: 'ODT actualizada exitosamente', 
            activoNuevoEstado: activo ? activo.estado : null 
        });

    } catch (error) {
        await t.rollback();
        console.error("Error en PUT OrdenMantenimiento:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}