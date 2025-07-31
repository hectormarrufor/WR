import { NextResponse } from 'next/server';
import db from '../../../../../../../models';

export async function DELETE(request, { params }) {
  const { mudanzaId, empleadoId } = await params;
  try {
    const asignacion = await db.AsignacionPersonalMudanza.findOne({
      where: { mudanzaId, empleadoId }
    });

    if (!asignacion) {
      return NextResponse.json({ message: 'Asignación de personal no encontrada' }, { status: 404 });
    }

    await asignacion.destroy(); // O marcar como finalizada si hay un campo de fechaFin
    return NextResponse.json({ message: 'Personal desasignado de la mudanza exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deassigning personal from mudanza:', error);
    return NextResponse.json({ message: 'Error al desasignar personal de la mudanza', error: error.message }, { status: 500 });
  }
}