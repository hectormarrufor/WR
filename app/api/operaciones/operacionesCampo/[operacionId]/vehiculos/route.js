// app/api/operaciones/operacionesCampo/[operacionId]/vehiculos/route.js
import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(request, { params }) {
  const { operacionId } = params;
  try {
    const operacion = await db.OperacionCampo.findByPk(operacionId);
    if (!operacion) {
      return NextResponse.json({ message: 'Operación de campo no encontrada' }, { status: 404 });
    }

    const asignaciones = await db.AsignacionVehiculoOperacion.findAll({
      where: { operacionId },
      include: [
        { model: db.Vehiculo, as: 'vehiculo' },
        { model: db.Empleado, as: 'conductor' }
      ],
      order: [['fechaAsignacion', 'ASC']]
    });
    return NextResponse.json(asignaciones);
  } catch (error) {
    console.error('Error fetching vehicle assignments for operation:', error);
    return NextResponse.json({ message: 'Error al obtener vehículos asignados a la operación de campo', error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { operacionId } = params;
  try {
    const body = await request.json(); // Espera { vehiculoId: 1, conductorId: 2, funcionVehiculo: 'Transporte de personal' }
    const { vehiculoId, conductorId, funcionVehiculo } = body;

    const operacion = await db.OperacionCampo.findByPk(operacionId);
    if (!operacion) {
      return NextResponse.json({ message: 'Operación de campo no encontrada' }, { status: 404 });
    }

    const vehiculo = await db.Vehiculo.findByPk(vehiculoId);
    if (!vehiculo) {
      return NextResponse.json({ message: 'Vehículo no encontrado' }, { status: 404 });
    }

    const conductor = await db.Empleado.findByPk(conductorId);
    if (!conductor) {
      return NextResponse.json({ message: 'Conductor no encontrado' }, { status: 404 });
    }

    const nuevaAsignacion = await db.AsignacionVehiculoOperacion.create({
      operacionId,
      vehiculoId,
      conductorId,
      funcionVehiculo,
      fechaAsignacion: new Date()
    });

    return NextResponse.json(nuevaAsignacion, { status: 201 });
  } catch (error) {
    console.error('Error assigning vehicle to operation:', error);
    return NextResponse.json({ message: 'Error al asignar vehículo a la operación de campo', error: error.message }, { status: 400 });
  }
}