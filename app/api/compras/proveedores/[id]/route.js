import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const proveedor = await db.Proveedor.findByPk(id, {
      include: [{ model: db.OrdenCompra, as: 'ordenesCompra' }],
    });
    if (!proveedor) {
      return NextResponse.json({ message: 'Proveedor no encontrado' }, { status: 404 });
    }
    return NextResponse.json(proveedor);
  } catch (error) {
    console.error('Error fetching proveedor:', error);
    return NextResponse.json({ message: 'Error al obtener proveedor', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const proveedor = await db.Proveedor.findByPk(id);
    if (!proveedor) {
      return NextResponse.json({ message: 'Proveedor no encontrado' }, { status: 404 });
    }
    await proveedor.update(body);
    return NextResponse.json(proveedor);
  } catch (error) {
    console.error('Error updating proveedor:', error);
    return NextResponse.json({ message: 'Error al actualizar proveedor', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const proveedor = await db.Proveedor.findByPk(id);
    if (!proveedor) {
      return NextResponse.json({ message: 'Proveedor no encontrado' }, { status: 404 });
    }

    // Opcional: Verificar si el proveedor tiene órdenes de compra asociadas
    // Si tiene, podrías prohibir la eliminación o hacer una "eliminación lógica" (marcar como inactivo)
    const ordenesCompraCount = await db.OrdenCompra.count({ where: { proveedorId: id } });
    if (ordenesCompraCount > 0) {
      return NextResponse.json({ message: 'No se puede eliminar el proveedor porque tiene órdenes de compra asociadas. Considere desactivarlo si su modelo lo permite.' }, { status: 400 });
    }

    await proveedor.destroy();
    return NextResponse.json({ message: 'Proveedor eliminado exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting proveedor:', error);
    return NextResponse.json({ message: 'Error al eliminar proveedor', error: error.message }, { status: 500 });
  }
}