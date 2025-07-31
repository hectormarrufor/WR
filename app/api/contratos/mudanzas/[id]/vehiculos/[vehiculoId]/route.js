// app/api/operaciones/mudanzas/[mudanzaId]/vehiculos/[vehiculoId]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../../../models';

export async function DELETE(request, { params }) {
  const { mudanzaId, vehiculoId } = await params;
  try {
    const asignacion = await db.AsignacionVehiculoMudanza.findOne({
      where: { mudanzaId, vehiculoId }
    });

    if (!asignacion) {
      return NextResponse.json({ message: 'Asignación de vehículo no encontrada' }, { status: 404 });
    }

    await asignacion.destroy(); // O marcar como finalizada si hay un campo de fechaFin
    return NextResponse.json({ message: 'Vehículo desasignado de la mudanza exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deassigning vehicle from mudanza:', error);
    return NextResponse.json({ message: 'Error al desasignar vehículo de la mudanza', error: error.message }, { status: 500 });
  }
}