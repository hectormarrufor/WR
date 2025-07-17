// app/api/superuser/notas-credito/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../../models';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const notaCredito = await db.NotaCredito.findByPk(id, {
      include: [
        { model: db.Factura, as: 'factura', include: [{ model: db.Cliente, as: 'cliente' }] },
        { model: db.Empleado, as: 'emitidaPor' }
      ],
    });

    if (!notaCredito) {
      return NextResponse.json({ message: 'Nota de Crédito no encontrada' }, { status: 404 });
    }
    return NextResponse.json(notaCredito);
  } catch (error) {
    console.error('Error fetching nota de credito:', error);
    return NextResponse.json({ message: 'Error al obtener nota de crédito', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const notaCredito = await db.NotaCredito.findByPk(id);

    if (!notaCredito) {
      return NextResponse.json({ message: 'Nota de Crédito no encontrada' }, { status: 404 });
    }

    await notaCredito.update(body);
    return NextResponse.json(notaCredito);
  } catch (error) {
    console.error('Error updating nota de credito:', error);
    return NextResponse.json({ message: 'Error al actualizar nota de crédito', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const notaCredito = await db.NotaCredito.findByPk(id);

    if (!notaCredito) {
      return NextResponse.json({ message: 'Nota de Crédito no encontrada' }, { status: 404 });
    }

    // Considera si quieres eliminarla físicamente o cambiar su estado a "Anulada"
    await notaCredito.destroy();
    // O: await notaCredito.update({ estado: 'Anulada' });

    return NextResponse.json({ message: 'Nota de Crédito eliminada exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting nota de credito:', error);
    return NextResponse.json({ message: 'Error al eliminar nota de crédito', error: error.message }, { status: 500 });
  }
}