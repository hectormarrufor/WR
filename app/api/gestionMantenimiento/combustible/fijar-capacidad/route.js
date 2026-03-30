import { NextResponse } from 'next/server';
import { Activo } from '@/models';

export async function POST(request) {
    try {
        const { activoId, capacidad } = await request.json();

        if (!activoId || !capacidad) {
            return NextResponse.json({ success: false, error: 'Faltan datos obligatorios' }, { status: 400 });
        }

        const activo = await Activo.findByPk(activoId);
        
        if (!activo) {
            return NextResponse.json({ success: false, error: 'Activo no encontrado' }, { status: 404 });
        }

        // Actualizamos la propiedad directa del modelo Activo
        activo.capacidadTanque = parseFloat(capacidad);
        
        // Prevención de errores matemáticos futuros si el equipo es totalmente nuevo
        if (activo.nivelCombustible === null || activo.nivelCombustible === undefined) {
            activo.nivelCombustible = 0;
        }

        await activo.save();

        return NextResponse.json({ 
            success: true, 
            message: 'Capacidad de tanque actualizada en el equipo' 
        });

    } catch (error) {
        console.error("Error fijando capacidad del activo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}