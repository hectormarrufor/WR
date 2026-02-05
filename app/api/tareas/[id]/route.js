import { NextResponse } from 'next/server';
import db from '@/models';
import { notificarCabezas } from '../../notificar/route'; // Asegúrate que la ruta sea correcta

export async function PATCH(request, { params }) {
    try {
        // 1. Obtener ID y Datos (Next.js 15 requiere await params)
        const { id } = await params;
        const data = await request.json();

        // 2. Buscar la tarea existente
        const tarea = await db.Tarea.findByPk(id);

        if (!tarea) {
            return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
        }

        // 3. Capturar el estado ANTERIOR antes de actualizar
        const estadoAnterior = tarea.estado;
        
        // 4. Actualizar la tarea con los datos nuevos
        // Esto actualiza cualquier campo que venga en 'data' (titulo, descripcion, estado, etc.)
        await tarea.update(data);

        // 5. Lógica de Notificación Inteligente
        // Verificamos si hubo un cambio de estado
        if (data.estado && data.estado !== estadoAnterior) {
            
            let tituloNotif = 'Actualización de Tarea';
            let cuerpoNotif = `La tarea "${tarea.titulo}" ha cambiado de estado a: ${data.estado} por ${data.nombre || 'alguien'}.`;
            let icono = '📋';

            // Personalizamos el mensaje según el nuevo estado
            switch (data.estado) {
                case 'Completada':
                case 'Finalizada':
                    tituloNotif = 'Tarea Completada ✅';
                    cuerpoNotif = `¡Éxito! La tarea "${tarea.titulo}" ha sido marcada como completada por ${data.nombre || 'alguien'}.`;
                    break;
                
                case 'Cancelada':
                case 'Eliminada': // Si usas soft-delete (borrado lógico)
                    tituloNotif = 'Tarea Cancelada 🚫';
                    cuerpoNotif = `Atención: La tarea "${tarea.titulo}" ha sido cancelada o eliminada por ${data.nombre || 'alguien'}.`;
                    break;

                case 'En Progreso':
                case 'En curso':
                    tituloNotif = 'Tarea en Marcha 🚀';
                    cuerpoNotif = `La tarea "${tarea.titulo}" ha comenzado por ${data.nombre || 'alguien'}.`;
                    break;
                
                case 'Detenida':
                case 'Pausada':
                    tituloNotif = 'Tarea Pausada ⏸️';
                    cuerpoNotif = `La tarea "${tarea.titulo}" se encuentra detenida temporalmente por ${data.nombre || 'alguien'}.`;
                    break;
            }

            // Enviamos la notificación
            await notificarCabezas({
                title: tituloNotif,
                body: cuerpoNotif,
                url: `/superuser` // O la URL específica de la tarea si la tienes
            });
        } 
        // Opcional: Notificar si cambió algo importante que no sea el estado (ej. la fecha límite)
        else if (data.fecha_limite && data.fecha_limite !== tarea.fecha_limite) {
             await notificarCabezas({
                title: 'Cambio de Fecha 📅',
                body: `La fecha límite de la tarea "${tarea.titulo}" ha sido modificada por ${data.nombre || 'alguien'}.`,
                url: `/superuser`
            });
        }

        return NextResponse.json({ success: true, tarea });

    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        return NextResponse.json({ error: 'Error al actualizar la tarea' }, { status: 500 });
    }
}