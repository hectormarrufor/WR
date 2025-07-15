import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const mudanza = await db.Mudanza.findByPk(id, {
      include: [
        { model: db.RenglonContrato, as: 'renglonContrato' },
        {
          model: db.AsignacionPersonalMudanza,
          as: 'asignacionesPersonal',
          include: [{ model: db.Empleado, as: 'empleado' }]
        },
        {
          model: db.AsignacionVehiculoMudanza,
          as: 'asignacionesVehiculos',
          include: [{ model: db.Vehiculo, as: 'vehiculo' }, { model: db.Empleado, as: 'conductor' }]
        },
      ],
    });

    if (!mudanza) {
      return NextResponse.json({ message: 'Mudanza no encontrada' }, { status: 404 });
    }
    return NextResponse.json(mudanza);
  } catch (error) {
    console.error('Error fetching mudanza:', error);
    return NextResponse.json({ message: 'Error al obtener mudanza', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const mudanza = await db.Mudanza.findByPk(id);
    if (!mudanza) {
      return NextResponse.json({ message: 'Mudanza no encontrada' }, { status: 404 });
    }
    await mudanza.update(body);
    return NextResponse.json(mudanza);
  } catch (error) {
    console.error('Error updating mudanza:', error);
    return NextResponse.json({ message: 'Error al actualizar mudanza', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const mudanza = await db.Mudanza.findByPk(id);
    if (!mudanza) {
      return NextResponse.json({ message: 'Mudanza no encontrada' }, { status: 404 });
    }
    await mudanza.destroy();
    return NextResponse.json({ message: 'Mudanza eliminada exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting mudanza:', error);
    return NextResponse.json({ message: 'Error al eliminar mudanza', error: error.message }, { status: 500 });
  }
}