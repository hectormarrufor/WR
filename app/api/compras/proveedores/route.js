import { NextResponse } from 'next/server';
import db from '../../../../models';

export async function GET(request) {
  try {
    const proveedores = await db.Proveedor.findAll({
      order: [['nombre', 'ASC']],
    });
    return NextResponse.json(proveedores);
  } catch (error) {
    console.error('Error fetching proveedores:', error);
    return NextResponse.json({ message: 'Error al obtener proveedores', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoProveedor = await db.Proveedor.create(body);
    return NextResponse.json(nuevoProveedor, { status: 201 });
  } catch (error) {
    console.error('Error creating proveedor:', error);
    return NextResponse.json({ message: 'Error al crear proveedor', error: error.message }, { status: 400 });
  }
}