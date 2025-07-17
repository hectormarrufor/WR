// app/api/operaciones/operacionesCampo/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const operacion = await db.OperacionCampo.findByPk(id, {
      include: [
        { model: db.RenglonContrato, as: 'renglonContrato' },
        {
          model: db.AsignacionVehiculoOperacion,
          as: 'asignacionesVehiculos',
          include: [{ model: db.Vehiculo, as: 'vehiculo' }, { model: db.Empleado, as: 'conductor' }]
        },
        // Si el modelo OperacionCampo tiene un campo para el responsable/supervisor, incluirlo aquí
        // { model: db.Empleado, as: 'supervisor' }
      ],
    });

    if (!operacion) {
      return NextResponse.json({ message: 'Operación de campo no encontrada' }, { status: 404 });
    }
    return NextResponse.json(operacion);
  } catch (error) {
    console.error('Error fetching operacion de campo:', error);
    return NextResponse.json({ message: 'Error al obtener operación de campo', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const operacion = await db.OperacionCampo.findByPk(id);
    if (!operacion) {
      return NextResponse.json({ message: 'Operación de campo no encontrada' }, { status: 404 });
    }
    await operacion.update(body);
    return NextResponse.json(operacion);
  } catch (error) {
    console.error('Error updating operacion de campo:', error);
    return NextResponse.json({ message: 'Error al actualizar operación de campo', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const operacion = await db.OperacionCampo.findByPk(id);
    if (!operacion) {
      return NextResponse.json({ message: 'Operación de campo no encontrada' }, { status: 404 });
    }
    await operacion.destroy();
    return NextResponse.json({ message: 'Operación de campo eliminada exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting operacion de campo:', error);
    return NextResponse.json({ message: 'Error al eliminar operación de campo', error: error.message }, { status: 500 });
  }
}