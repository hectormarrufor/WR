// app/api/operaciones/operacionesCampo/route.js
import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const renglonId = searchParams.get('renglonId');
    const includeVehiculos = searchParams.get('includeVehiculos') === 'true';

    const whereClause = renglonId ? { renglonId } : {};
    const includeOptions = [{ model: db.RenglonContrato, as: 'renglonContrato' }];

    if (includeVehiculos) {
      includeOptions.push({
        model: db.AsignacionVehiculoOperacion,
        as: 'asignacionesVehiculos',
        include: [{ model: db.Vehiculo, as: 'vehiculo' }, { model: db.Empleado, as: 'conductor' }]
      });
    }

    const operaciones = await db.OperacionCampo.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['fechaInicio', 'DESC']],
    });
    return NextResponse.json(operaciones);
  } catch (error) {
    console.error('Error fetching operaciones de campo:', error);
    return NextResponse.json({ message: 'Error al obtener operaciones de campo', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nuevaOperacion = await db.OperacionCampo.create(body);
    return NextResponse.json(nuevaOperacion, { status: 201 });
  } catch (error) {
    console.error('Error creating operacion de campo:', error);
    return NextResponse.json({ message: 'Error al crear operación de campo', error: error.message }, { status: 400 });
  }
}