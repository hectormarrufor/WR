import { NextResponse } from 'next/server';
import db from '@/models';

export async function POST(req, { params }) {
    const { id } = await params; // Este es el ID del Activo (Camión)
    
    try {
        const body = await req.json();
        
        // Si tu base de datos maneja los seriales en una tabla aparte (basado en tu código anterior)
        let serialFisicoId = null;
        if (body.serial) {
            const nuevoSerial = await db.SerialFisico.create({ 
                serial: body.serial, 
                estado: 'Instalado' 
            });
            serialFisicoId = nuevoSerial.id;
        }

        const nuevaInstalacion = await db.ConsumibleInstalado.create({
            activoId: id,
            subsistemaInstanciaId: body.subsistemaInstanciaId,
            consumibleRecomendadoId: body.consumibleRecomendadoId, // El ID del Slot/Puesto
            fichaTecnicaId: body.fichaTecnicaId,
            serialFisicoId: serialFisicoId,
            kilometrajeInstalacion: body.kilometrajeInstalacion || 0,
            fechaInstalacion: new Date()
        });

        return NextResponse.json({ success: true, data: nuevaInstalacion });
    } catch (error) {
        console.error("Error instalando pieza:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}