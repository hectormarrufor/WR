import db from '@/models';
import { NextResponse } from 'next/server';

export async function PUT(request) {
    try {
        const body = await request.json();
        const tipoId = body.id;
        const nombreTipo = body.nombre;
        const especificaciones = body.especificaciones;
        const unidadMedida = body.unidadMedida;

        if (!tipoId) {
            return NextResponse.json({ success: false, error: "El ID del tipo de consumible es obligatorio." }, { status: 400 });
        }
        const tipo = await db.TipoConsumible.findByPk(tipoId);
        if (!tipo) {
            return NextResponse.json({ success: false, error: "Tipo de consumible no encontrado." }, { status: 404 });
        }
        tipo.nombre = nombreTipo || tipo.nombre;
        tipo.especificaciones = especificaciones || tipo.especificaciones;
        tipo.unidadMedida = unidadMedida || tipo.unidadMedida;

        await tipo.save();
        return NextResponse.json({ success: true, data: tipo }, { status: 200 });
    }
    catch (error) {
        console.error("Error al actualizar el tipo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE() {
    try {
        const body = await request.json();
        const tipoId = body.id;
        if (!tipoId) {
            return NextResponse.json({ success: false, error: "El ID del tipo de consumible es obligatorio." }, { status: 400 });
        }   
        const tipo = await db.TipoConsumible.findByPk(tipoId);
        if (!tipo) {
            return NextResponse.json({ success: false, error: "Tipo de consumible no encontrado." }, { status: 404 });
        }
        await tipo.destroy();
        return NextResponse.json({ success: true, message: "Tipo de consumible eliminado correctamente." }, { status: 200 });
    }   
    catch (error) {
        console.error("Error al eliminar el tipo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}