import db from '@/models';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const viscosidades = await db.ViscosidadAceite.findAll();
        return NextResponse.json({ success: true, data: viscosidades });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        let nuevasViscosidades = body.viscosidades;
        if (!Array.isArray(nuevasViscosidades)) {
            nuevasViscosidades = [nuevasViscosidades];
        }
        // 1. Encontrar o crear la única fila del modelo.
        let viscosidadRow = await db.ViscosidadAceite.findOne();
        if (!viscosidadRow) {
            viscosidadRow = await db.ViscosidadAceite.create({ viscosidades: [] });
        }
        // 2. Combinar las viscosidades existentes con las nuevas y eliminar duplicados.
        const viscosidadesActuales = viscosidadRow.viscosidades || [];
        const todasLasViscosidades = new Set([...viscosidadesActuales, ...nuevasViscosidades]);
        const viscosidadesSinDuplicados = Array.from(todasLasViscosidades).filter(v => v !== null && v !== '');
        // 3. Ordenar el array para mantener la consistencia
        viscosidadesSinDuplicados.sort();
        // 4. Actualizar la fila con el nuevo array de viscosidades
        await viscosidadRow.update({ viscosidades: viscosidadesSinDuplicados });
        return NextResponse.json({ success: true, data: viscosidadRow }, { status: 201 });
    } catch (error) {
        console.error("ERROR en la API de viscosidades de aceite:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}