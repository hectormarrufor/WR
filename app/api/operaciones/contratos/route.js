import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeRenglones = searchParams.get('includeRenglones') === 'true';

    const includeOptions = [];
    if (includeRenglones) {
      includeOptions.push({
        model: db.RenglonContrato,
        as: 'renglones',
      });
    }

    const contratos = await db.ContratoServicio.findAll({
      include: includeOptions,
      order: [['fechaInicio', 'DESC']],
    });
    return NextResponse.json(contratos);
  } catch (error) {
    console.error('Error fetching contratos:', error);
    return NextResponse.json({ message: 'Error al obtener contratos', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoContrato = await db.ContratoServicio.create(body);
    return NextResponse.json(nuevoContrato, { status: 201 });
  } catch (error) {
    console.error('Error creating contrato:', error);
    return NextResponse.json({ message: 'Error al crear contrato', error: error.message }, { status: 400 });
  }
}