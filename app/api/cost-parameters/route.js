import { CostParameters } from '@/models';
import { NextResponse } from 'next/server';

export async function GET() {
  let params = await CostParameters.findOne();

  // Si no existen aún, crear con valores por defecto
  if (!params) {
    params = await CostParameters.create({
      fuelPrice: 0.65,
      operatorRate: 5,
      resguardoRate: 3,
      posesionRate: 2,
      manoObraFija: 500,
      manoObraVariable: 5,
      mantenimientoMensual: 300,
      administrativosMensual: 200
    });
  }

  return NextResponse.json(params);
}

export async function PUT(req) {
  const body = await req.json();
  let params = await CostParameters.findOne();

  if (!params) {
    params = await CostParameters.create(body);
  } else {
    await params.update(body);
  }

  return NextResponse.json(params);
}