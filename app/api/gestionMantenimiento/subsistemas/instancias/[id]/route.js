import { NextResponse } from "next/server";
import db from "@/models";
import { sequelize } from "@/models";

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();

        const instancia = await db.SubsistemaInstancia.findByPk(id);
        
        if (!instancia) {
            return NextResponse.json({ success: false, error: "Subsistema no encontrado" }, { status: 404 });
        }

        if (!body.nombre || body.nombre.trim().length < 3) {
            return NextResponse.json({ success: false, error: "El nombre es inválido" }, { status: 400 });
        }

        await instancia.update({ nombre: body.nombre.trim() });

        return NextResponse.json({ success: true, data: instancia });

    } catch (error) {
        console.error("Error al renombrar subsistema:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const t = await sequelize.transaction();
    try {
        const { id } = await params;

        const instancia = await db.SubsistemaInstancia.findByPk(id, { transaction: t });
        
        if (!instancia) {
            await t.rollback();
            return NextResponse.json({ success: false, error: "Subsistema no encontrado" }, { status: 404 });
        }

        // Al destruir la instancia, Sequelize ejecutará la eliminación en cascada 
        // de todas las piezas (ConsumibleInstalado) asociadas a este subsistema 
        // en este camión específico, gracias a tu configuración onDelete: 'CASCADE'.
        await instancia.destroy({ transaction: t });

        await t.commit();
        return NextResponse.json({ success: true });

    } catch (error) {
        await t.rollback();
        console.error("Error al eliminar subsistema:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}