import { NextResponse } from "next/server";
import { DocumentoEmpleado } from "@/models";

// POST: Crear nuevo documento
export async function POST(req) {
    try {
        const body = await req.json();
        const doc = await DocumentoEmpleado.create(body);
        return NextResponse.json(doc);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Borrar documento
export async function DELETE(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    try {
        await DocumentoEmpleado.destroy({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}