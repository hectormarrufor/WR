import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(request, { params }) {
  const { mudanzaId } = params;
  try {
    const mudanza = await db.Mudanza.findByPk(mudanzaId);
    if (!mudanza) {
      return NextResponse.json({ message: 'Mudanza no encontrada' }, { status: 404 });
    }

    const asignaciones = await db.AsignacionPersonalMudanza.findAll({
      where: { mudanzaId },
      include: [{ model: db.Empleado, as: 'empleado' }],
      order: [['fechaAsignacion', 'ASC']]
    });
    return NextResponse.json(asignaciones);
  } catch (error) {
    console.error('Error fetching personal assignments:', error);
    return NextResponse.json({ message: 'Error al obtener personal asignado a la mudanza', error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { mudanzaId } = params;
  try {
    const body = await request.json(); // Espera { empleadoId: 1, rolEnMudanza: 'Chofer' }
    const { empleadoId, rolEnMudanza } = body;

    const mudanza = await db.Mudanza.findByPk(mudanzaId);
    if (!mudanza) {
      return NextResponse.json({ message: 'Mudanza no encontrada' }, { status: 404 });
    }

    const empleado = await db.Empleado.findByPk(empleadoId);
    if (!empleado) {
      return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });
    }

    const nuevaAsignacion = await db.AsignacionPersonalMudanza.create({
      mudanzaId,
      empleadoId,
      rolEnMudanza,
      fechaAsignacion: new Date()
    });

    return NextResponse.json(nuevaAsignacion, { status: 201 });
  } catch (error) {
    console.error('Error assigning personal to mudanza:', error);
    return NextResponse.json({ message: 'Error al asignar personal a la mudanza', error: error.message }, { status: 400 });
  }
}