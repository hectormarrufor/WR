import { NextResponse } from 'next/server';
import db from '../../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;
    const includePuestos = searchParams.get('includePuestos') === 'true'; // Opcional para incluir puestos

    const includeOptions = [];
    if (includePuestos) {
      includeOptions.push({
        model: db.Puesto,
        as: 'puestos', // Asegúrate que este alias coincida con tu asociación en Empleado.js
        through: { attributes: [] } // No incluir la tabla intermedia EmpleadoPuesto
      });
    }

    const empleados = await db.Empleado.findAll({
      include: includeOptions,
      order: [['nombre', 'ASC']],
    })
    return NextResponse.json(empleados);
    // const { rows: empleados, count } = await db.Empleado.findAndCountAll({
    //   limit,
    //   offset,
    //   include: includeOptions,
    //   order: [['nombre', 'ASC']],
    // });

    // return NextResponse.json({ total: count, page, limit, data: empleados });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ message: 'Error al obtener empleados', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoEmpleado = await db.Empleado.create(body);

    return NextResponse.json(nuevoEmpleado, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ message: 'Error al crear empleado', error: error.message }, { status: 400 });
  }
}