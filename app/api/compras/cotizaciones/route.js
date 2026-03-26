import { NextResponse } from "next/server";
import db from "@/models";

export async function POST(request) {
    const t = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { requisicionId, proveedorId, detalles } = body;

        // 1. Generar código de Cotización
        const count = await db.Cotizacion.count({ transaction: t });
        const codigoCot = `COT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        // 2. Crear la Cabecera de la Cotización
        const nuevaCotizacion = await db.Cotizacion.create({
            codigo: codigoCot,
            requisicionId,
            proveedorId,
            estado: 'Recibida'
        }, { transaction: t });

        // 3. Crear los Detalles (Ítem por ítem)
        const detallesData = detalles.map(det => ({
            cotizacionId: nuevaCotizacion.id,
            requisicionDetalleId: det.requisicionDetalleId,
            cantidadOfertada: det.cantidadOfertada,
            precioUnitario: det.precioUnitario,
            estadoSeleccion: 'Pendiente',
            // Buscamos el consumibleId desde la RequisicionDetalle original
            consumibleId: null // Opcional: podrías pasarlo desde el front para no hacer query extra aquí
        }));

        await db.CotizacionDetalle.bulkCreate(detallesData, { transaction: t });

        await t.commit();
        return NextResponse.json({ success: true, data: nuevaCotizacion });

    } catch (error) {
        await t.rollback();
        console.error("Error guardando cotización:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}