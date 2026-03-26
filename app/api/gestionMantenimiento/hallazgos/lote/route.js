import { NextResponse } from "next/server";
import db from "@/models";

export async function DELETE(request) {
    try {
        const { ids } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ success: false, error: 'No se enviaron IDs válidos' }, { status: 400 });
        }

        // Se usa db.Hallazgo.destroy con un array para borrar todo en una sola query
        const borrados = await db.Hallazgo.destroy({
            where: {
                id: ids
            }
        });

        return NextResponse.json({ success: true, message: `Se eliminaron ${borrados} hallazgos` });

    } catch (error) {
        console.error("Error eliminando hallazgos en lote:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}