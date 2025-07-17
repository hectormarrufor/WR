import { NextResponse } from 'next/server';
import db from '../../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const renglonId = searchParams.get('renglonId'); // Filtrar por renglón si se envía
    const includeAsignaciones = searchParams.get('includeAsignaciones') === 'true';

    const whereClause = renglonId ? { renglonId } : {};
    const includeOptions = [];

    if (includeAsignaciones) {
      includeOptions.push({
        model: db.AsignacionPersonalMudanza,
        as: 'asignacionesPersonal', // Alias definido en Mudanza.js
        include: [{ model: db.Empleado, as: 'empleado' }]
      });
      includeOptions.push({
        model: db.AsignacionVehiculoMudanza,
        as: 'asignacionesVehiculos', // Alias definido en Mudanza.js
        include: [{ model: db.Vehiculo, as: 'vehiculo' }, { model: db.Empleado, as: 'conductor' }]
      });
    }

    const mudanzas = await db.Mudanza.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['fechaInicio', 'DESC']],
    });
    return NextResponse.json(mudanzas);
  } catch (error) {
    console.error('Error fetching mudanzas:', error);
    return NextResponse.json({ message: 'Error al obtener mudanzas', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nuevaMudanza = await db.Mudanza.create(body);
    return NextResponse.json(nuevaMudanza, { status: 201 });
  } catch (error) {
    console.error('Error creating mudanza:', error);
    return NextResponse.json({ message: 'Error al crear mudanza', error: error.message }, { status: 400 });
  }
}