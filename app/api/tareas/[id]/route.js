// app/api/tareas/[id]/route.js
import { NextResponse } from 'next/server';
import db from '@/models';

export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        
        // Podemos recibir 'estado' Y/O 'asignadoAId' (para asumir tarea)
        const updateData = {};
        if (body.estado) updateData.estado = body.estado;
        if (body.asignadoAId) updateData.asignadoAId = body.asignadoAId;

        await db.Tarea.update(updateData, { where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error actualizando' }, { status: 500 });
    }
}