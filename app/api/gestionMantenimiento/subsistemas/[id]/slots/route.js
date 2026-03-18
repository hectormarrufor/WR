import { NextResponse } from 'next/server';
import db from '@/models';

export async function POST(req, { params }) {
    // Este ID es el ID de la plantilla maestra (Subsistema), NO de la instancia.
    const { id } = await params; 
    
    try {
        const body = await req.json();
        
        const nuevoSlot = await db.ConsumibleRecomendado.create({
            subsistemaId: id,
            categoria: body.categoria,
            cantidad: body.cantidad || 1,
            valorCriterio: body.valorCriterio, // Ej: "Eje Trasero Izquierdo" o "295/80R22.5"
            tipoCriterio: 'individual'
        });

        return NextResponse.json({ success: true, data: nuevoSlot });
    } catch (error) {
        console.error("Error creando Slot:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}