// app/api/tareas/[id]/route.js
import { NextResponse } from 'next/server';
import db from '@/models';
import { notificarCabezas } from '../../notificar/route';

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

        const tarea = await db.Tarea.findByPk(id);
        if (!tarea) {
            return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
        }

        await tarea.destroy();

        notificarCabezas({
            title: 'Tarea Eliminada',
            body: `Se ha eliminado la tarea ${tarea.titulo}.`,
            url: `/superuser`
        });


        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
    }
}