import { NextResponse } from "next/server";
import db from "@/models";

export async function PATCH(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        const { estado } = body;

        const requisicion = await db.Requisicion.findByPk(id);
        if (!requisicion) {
            return NextResponse.json({ success: false, error: 'Requisición no encontrada' }, { status: 404 });
        }

        requisicion.estado = estado;
        await requisicion.save();

        // Lógica adicional: Si se aprueba, podrías generar la Orden de Compra automáticamente aquí.

        return NextResponse.json({ success: true, data: requisicion });
    } catch (error) {
        console.error("Error actualizando requisición:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const t = await db.sequelize.transaction();
    try {
        const { id } = params;

        // 1. Borrar los detalles asociados primero
        await db.RequisicionDetalle.destroy({
            where: { requisicionId: id },
            transaction: t
        });

        // 2. Borrar la requisición cabecera
        const borrados = await db.Requisicion.destroy({
            where: { id },
            transaction: t
        });

        if (borrados === 0) {
            await t.rollback();
            return NextResponse.json({ success: false, error: 'No se encontró la requisición' }, { status: 404 });
        }

        await t.commit();
        return NextResponse.json({ success: true, message: 'Eliminada correctamente' });
    } catch (error) {
        await t.rollback();
        console.error("Error eliminando requisición:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}