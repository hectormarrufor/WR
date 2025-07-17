// app/api/operaciones/mudanzas/[mudanzaId]/vehiculos/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../../models';

export async function GET(request, { params }) {
  const { mudanzaId } = params;
  try {
    const mudanza = await db.Mudanza.findByPk(mudanzaId);
    if (!mudanza) {
      return NextResponse.json({ message: 'Mudanza no encontrada' }, { status: 404 });
    }

    const asignaciones = await db.AsignacionVehiculoMudanza.findAll({
      where: { mudanzaId },
      include: [
        { model: db.Vehiculo, as: 'vehiculo' },
        { model: db.Empleado, as: 'conductor' }
      ],
      order: [['fechaAsignacion', 'ASC']]
    });
    return NextResponse.json(asignaciones);
  } catch (error) {
    console.error('Error fetching vehicle assignments for mudanza:', error);
    return NextResponse.json({ message: 'Error al obtener vehículos asignados a la mudanza', error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { mudanzaId } = params;
  try {
    const body = await request.json(); // Espera { vehiculoId: 1, conductorId: 2, tipoVehiculoMudanza: 'Camión' }
    const { vehiculoId, conductorId, tipoVehiculoMudanza } = body;

    const mudanza = await db.Mudanza.findByPk(mudanzaId);
    if (!mudanza) {
      return NextResponse.json({ message: 'Mudanza no encontrada' }, { status: 404 });
    }

    const vehiculo = await db.Vehiculo.findByPk(vehiculoId);
    if (!vehiculo) {
      return NextResponse.json({ message: 'Vehículo no encontrado' }, { status: 404 });
    }

    const conductor = await db.Empleado.findByPk(conductorId);
    if (!conductor) {
      return NextResponse.json({ message: 'Conductor no encontrado' }, { status: 404 });
    }

    const nuevaAsignacion = await db.AsignacionVehiculoMudanza.create({
      mudanzaId,
      vehiculoId,
      conductorId,
      tipoVehiculoMudanza,
      fechaAsignacion: new Date()
    });

    return NextResponse.json(nuevaAsignacion, { status: 201 });
  } catch (error) {
    console.error('Error assigning vehicle to mudanza:', error);
    return NextResponse.json({ message: 'Error al asignar vehículo a la mudanza', error: error.message }, { status: 400 });
  }
}