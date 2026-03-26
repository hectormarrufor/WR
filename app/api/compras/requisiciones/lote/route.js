import { NextResponse } from "next/server";
import db from "@/models";

export async function POST(request) {
    const t = await db.sequelize.transaction();
    try {
        const { requisiciones } = await request.json();

        const anio = new Date().getFullYear();
        let totalRequisiciones = await db.Requisicion.count({ transaction: t });

        for (const reqData of requisiciones) {
            totalRequisiciones++;
            const codigoReq = `REQ-${anio}-${String(totalRequisiciones).padStart(4, '0')}`;

            // 1. Crear Cabecera
            const nuevaReq = await db.Requisicion.create({
                codigo: codigoReq,
                fechaSolicitud: new Date(),
                prioridad: reqData.prioridad,
                justificacion: reqData.justificacion,
                estado: 'Pendiente',
                solicitadoPorId: reqData.solicitadoPorId,
                hallazgoId: reqData.hallazgoId
            }, { transaction: t });

            // 2. Crear Detalles
            const detallesData = reqData.detalles.map(d => ({
                requisicionId: nuevaReq.id,
                consumibleId: d.consumibleId,
                cantidadSolicitada: d.cantidadSolicitada,
                estado: 'Pendiente'
            }));

            await db.RequisicionDetalle.bulkCreate(detallesData, { transaction: t });

            // 3. Actualizar estado del Hallazgo
            await db.Hallazgo.update(
                { estado: 'Repuesto en Procura' },
                { where: { id: reqData.hallazgoId }, transaction: t }
            );
        }

        await t.commit();
        return NextResponse.json({ success: true, message: 'Requisiciones creadas en lote' });

    } catch (error) {
        await t.rollback();
        console.error("Error creando requisiciones en lote:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}