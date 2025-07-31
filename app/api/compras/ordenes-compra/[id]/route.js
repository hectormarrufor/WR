import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const ordenCompra = await db.OrdenCompra.findByPk(id, {
      include: [
        { model: db.Proveedor, as: 'proveedor' },
        { model: db.DetalleOrdenCompra, as: 'detalles', include: [{ model: db.Consumible, as: 'consumible' }] },
        { model: db.EntradaInventario, as: 'entradasInventario' } // Para ver qué entradas vinieron de esta OC
      ],
    });

    if (!ordenCompra) {
      return NextResponse.json({ message: 'Orden de Compra no encontrada' }, { status: 404 });
    }
    return NextResponse.json(ordenCompra);
  } catch (error) {
    console.error('Error fetching orden de compra:', error);
    return NextResponse.json({ message: 'Error al obtener orden de compra', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const ordenCompra = await db.OrdenCompra.findByPk(id);
    if (!ordenCompra) {
      return NextResponse.json({ message: 'Orden de Compra no encontrada' }, { status: 404 });
    }
    await ordenCompra.update(body);
    return NextResponse.json(ordenCompra);
  } catch (error) {
    console.error('Error updating orden de compra:', error);
    return NextResponse.json({ message: 'Error al actualizar orden de compra', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const ordenCompra = await db.OrdenCompra.findByPk(id);
    if (!ordenCompra) {
      return NextResponse.json({ message: 'Orden de Compra no encontrada' }, { status: 404 });
    }
    // Considerar lógica para manejar si ya hay entradas de inventario asociadas
    await ordenCompra.destroy();
    return NextResponse.json({ message: 'Orden de Compra eliminada exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting orden de compra:', error);
    return NextResponse.json({ message: 'Error al eliminar orden de compra', error: error.message }, { status: 500 });
  }
}