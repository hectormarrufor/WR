// /app/api/gestionMantenimiento/activos/[id]/documentos/route.js
import { NextResponse } from 'next/server';
import { DocumentoActivo } from '@/models';

export async function POST(request, { params }) {
    try {
        const body = await request.json(); // <-- Magia pura, solo leemos el JSON
        
        const nuevoDoc = await DocumentoActivo.create({
            tipo: body.tipo,
            numeroDocumento: body.numeroDocumento,
            fechaVencimiento: body.fechaVencimiento,
            imagen: body.imagen, // Aquí viene el string del nombre del archivo
            activoId: params.id
        });

        return NextResponse.json({ success: true, data: nuevoDoc });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}