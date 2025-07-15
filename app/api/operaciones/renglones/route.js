// app/api/operaciones/renglones/route.js
import { NextResponse } from 'next/server';
import db from '../../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const contratoId = searchParams.get('contratoId');
    const includeDetails = searchParams.get('includeDetails') === 'true'; // Para incluir mudanzas, ops, etc.

    const whereClause = contratoId ? { contratoId } : {};
    const includeOptions = [{ model: db.ContratoServicio, as: 'contrato' }];

    if (includeDetails) {
      includeOptions.push(
        { model: db.Mudanza, as: 'mudanzas' },
        { model: db.OperacionCampo, as: 'operacionesCampo' },
        { model: db.TrabajoExtra, as: 'trabajosExtra' },
        { model: db.ConsumoAlimento, as: 'consumosAlimento' }
      );
    }

    const renglones = await db.RenglonContrato.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['fechaCreacion', 'ASC']],
    });
    return NextResponse.json(renglones);
  } catch (error) {
    console.error('Error fetching renglones de contrato:', error);
    return NextResponse.json({ message: 'Error al obtener renglones de contrato', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoRenglon = await db.RenglonContrato.create(body);
    return NextResponse.json(nuevoRenglon, { status: 201 });
  } catch (error) {
    console.error('Error creating renglon de contrato:', error);
    return NextResponse.json({ message: 'Error al crear renglón de contrato', error: error.message }, { status: 400 });
  }
}