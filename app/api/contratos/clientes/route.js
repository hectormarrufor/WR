// app/api/superuser/clientes/route.js
import { NextResponse } from 'next/server';
import db from '../../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const activo = searchParams.get('activo'); // Filtro opcional por estado activo

    const whereClause = {};
    if (activo !== null) { // Si se especifica el parámetro 'activo'
      whereClause.activo = activo === 'true';
    }

    const clientes = await db.Cliente.findAll({
      where: whereClause,
      order: [['razonSocial', 'ASC'], ['nombreContacto', 'ASC']],
    });
    return NextResponse.json(clientes);
  } catch (error) {
    console.error('Error fetching clientes:', error);
    return NextResponse.json({ message: 'Error al obtener clientes', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoCliente = await db.Cliente.create(body);
    return NextResponse.json(nuevoCliente, { status: 201 });
  } catch (error) {
    console.error('Error creating cliente:', error);
    return NextResponse.json({ message: 'Error al crear cliente', error: error.message }, { status: 400 });
  }
}