// app/api/operaciones/operacionesCampo/[operacionId]/vehiculos/[vehiculoId]/route.js
import { NextResponse } from 'next/server';
import db from '@/models';

export async function DELETE(request, { params }) {
  const { operacionId, vehiculoId } = params;
  try {
    const asignacion = await db.AsignacionVehiculoOperacion.findOne({
      where: { operacionId, vehiculoId }
    });

    if (!asignacion) {
      return NextResponse.json({ message: 'Asignación de vehículo no encontrada' }, { status: 404 });
    }

    await asignacion.destroy();
    return NextResponse.json({ message: 'Vehículo desasignado de la operación de campo exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deassigning vehicle from operation:', error);
    return NextResponse.json({ message: 'Error al desasignar vehículo de la operación de campo', error: error.message }, { status: 500 });
  }
}