// app/api/operaciones/renglones/[id]/route.js
import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const renglon = await db.RenglonContrato.findByPk(id, {
      include: [
        { model: db.ContratoServicio, as: 'contrato' },
        { model: db.Mudanza, as: 'mudanzas' },
        { model: db.OperacionCampo, as: 'operacionesCampo' },
        { model: db.TrabajoExtra, as: 'trabajosExtra' },
        { model: db.ConsumoAlimento, as: 'consumosAlimento' }
      ],
    });

    if (!renglon) {
      return NextResponse.json({ message: 'Renglón de contrato no encontrado' }, { status: 404 });
    }
    return NextResponse.json(renglon);
  } catch (error) {
    console.error('Error fetching renglon de contrato:', error);
    return NextResponse.json({ message: 'Error al obtener renglón de contrato', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const renglon = await db.RenglonContrato.findByPk(id);
    if (!renglon) {
      return NextResponse.json({ message: 'Renglón de contrato no encontrado' }, { status: 404 });
    }
    await renglon.update(body);
    return NextResponse.json(renglon);
  } catch (error) {
    console.error('Error updating renglon de contrato:', error);
    return NextResponse.json({ message: 'Error al actualizar renglón de contrato', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const renglon = await db.RenglonContrato.findByPk(id);
    if (!renglon) {
      return NextResponse.json({ message: 'Renglón de contrato no encontrado' }, { status: 404 });
    }
    // Considerar lógica si este renglón tiene mudanzas/operaciones/trabajos extra asociados.
    // Podrías evitar la eliminación si existen dependencias.
    await renglon.destroy();
    return NextResponse.json({ message: 'Renglón de contrato eliminado exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting renglon de contrato:', error);
    return NextResponse.json({ message: 'Error al eliminar renglón de contrato', error: error.message }, { status: 500 });
  }
}