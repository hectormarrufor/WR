import { NextResponse } from "next/server";
import db from "@/models";

export async function GET(request, { params }) {
    try {
        const { id } = await params; // En Next.js 15 params es una promesa
        
        const proveedor = await db.Proveedor.findByPk(id);
        if (!proveedor) {
            return NextResponse.json({ success: false, error: 'Proveedor no encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: proveedor });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();

        const proveedor = await db.Proveedor.findByPk(id);
        if (!proveedor) {
            return NextResponse.json({ success: false, error: 'Proveedor no encontrado' }, { status: 404 });
        }

        await proveedor.update(body);

        return NextResponse.json({ success: true, data: proveedor });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return NextResponse.json({ success: false, error: 'Ya existe un proveedor con ese nombre o RIF' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

        const borrados = await db.Proveedor.destroy({ where: { id } });
        
        if (borrados === 0) {
            return NextResponse.json({ success: false, error: 'Proveedor no encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Proveedor eliminado correctamente' });
    } catch (error) {
        // Captura error si intentas borrar un proveedor que ya tiene compras asociadas
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return NextResponse.json({ success: false, error: 'No se puede eliminar el proveedor porque tiene operaciones asociadas.' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}