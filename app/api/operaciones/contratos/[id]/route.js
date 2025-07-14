import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const contrato = await db.ContratoServicio.findByPk(id, {
      include: [
        { model: db.RenglonContrato, as: 'renglones' },
        // Puedes incluir también movimientos de tesorería y salidas de inventario asociadas
        { model: db.MovimientoTesoreria, as: 'movimientosFinancieros' },
        { model: db.SalidaInventario, as: 'salidasInventarioPorVenta' },
      ],
    });

    if (!contrato) {
      return NextResponse.json({ message: 'Contrato no encontrado' }, { status: 404 });
    }
    return NextResponse.json(contrato);
  } catch (error) {
    console.error('Error fetching contrato:', error);
    return NextResponse.json({ message: 'Error al obtener contrato', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const contrato = await db.ContratoServicio.findByPk(id);
    if (!contrato) {
      return NextResponse.json({ message: 'Contrato no encontrado' }, { status: 404 });
    }
    await contrato.update(body);
    return NextResponse.json(contrato);
  } catch (error) {
    console.error('Error updating contrato:', error);
    return NextResponse.json({ message: 'Error al actualizar contrato', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const contrato = await db.ContratoServicio.findByPk(id);
    if (!contrato) {
      return NextResponse.json({ message: 'Contrato no encontrado' }, { status: 404 });
    }
    await contrato.destroy();
    return NextResponse.json({ message: 'Contrato eliminado exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting contrato:', error);
    return NextResponse.json({ message: 'Error al eliminar contrato', error: error.message }, { status: 500 });
  }
}