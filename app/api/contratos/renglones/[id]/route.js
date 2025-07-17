// src/app/api/operaciones/renglones/[id]/route.js
import { NextResponse } from 'next/server';
import { Cliente, ConsumoAlimento, ContratoServicio, Mudanza, OperacionCampo, RenglonContrato, TrabajoExtra } from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const renglon = await RenglonContrato.findByPk(id, {
      include: [
        {
          model: ContratoServicio, as: 'contrato', include: [{
            model: Cliente, as: 'cliente'
          }]
        },
        { model: Mudanza, as: 'mudanza' },
        { model: OperacionCampo, as: 'operacionesCampo' },
        { model: TrabajoExtra, as: 'trabajosExtra' },
        { model: ConsumoAlimento, as: 'consumoAlimentos' }
      ]
    });
    if (!renglon) {
      return NextResponse.json({ error: 'Renglón no encontrado' }, { status: 404 });
    }
    return NextResponse.json(renglon);
  } catch (error) {
    console.error(`Error al obtener renglón ${id}:`, error);
    return NextResponse.json({ error: 'Error interno del servidor al obtener renglón', details: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  const renglonData = await request.json();

  try {
    const renglon = await RenglonContrato.findByPk(id);
    if (!renglon) {
      return NextResponse.json({ error: 'Renglón no encontrado' }, { status: 404 });
    }

    await renglon.update(renglonData);

    return NextResponse.json(renglon, { status: 200 });
  } catch (error) {
    console.error(`Error al actualizar renglón ${id}:`, error);
    return NextResponse.json({ error: 'Error interno del servidor al actualizar renglón', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const deletedCount = await RenglonContrato.destroy({
      where: { id },
    });

    if (deletedCount === 0) {
      return NextResponse.json({ error: 'Renglón no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Renglón eliminado exitosamente' }, { status: 200 });
  } catch (error) {
    console.error(`Error al eliminar renglón ${id}:`, error);
    return NextResponse.json({ error: 'Error interno del servidor al eliminar renglón', details: error.message }, { status: 500 });
  }
}