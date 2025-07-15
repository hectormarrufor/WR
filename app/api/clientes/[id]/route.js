// app/api/superuser/clientes/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../models';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const cliente = await db.Cliente.findByPk(id, {
      include: [
        { model: db.ContratoServicio, as: 'contratos' },
        { model: db.Factura, as: 'facturas' },
      ],
    });

    if (!cliente) {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }
    return NextResponse.json(cliente);
  } catch (error) {
    console.error('Error fetching cliente:', error);
    return NextResponse.json({ message: 'Error al obtener cliente', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const cliente = await db.Cliente.findByPk(id);

    if (!cliente) {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }

    await cliente.update(body);
    return NextResponse.json(cliente);
  } catch (error) {
    console.error('Error updating cliente:', error);
    return NextResponse.json({ message: 'Error al actualizar cliente', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const cliente = await db.Cliente.findByPk(id);

    if (!cliente) {
      return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    }

    // Considerar eliminación lógica (ej. cambiar 'activo' a false) si hay dependencias
    await cliente.destroy(); // O await cliente.update({ activo: false });

    return NextResponse.json({ message: 'Cliente eliminado exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting cliente:', error);
    return NextResponse.json({ message: 'Error al eliminar cliente', error: error.message }, { status: 500 });
  }
}