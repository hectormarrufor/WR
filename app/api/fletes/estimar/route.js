import calcularCostoFlete from '@/app/handlers/calculoCostoFlete';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();

    // Aquí puedes agregar validaciones básicas si quieres
    if (!body.activoPrincipalId || !body.distanciaKm) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const resultado = await calcularCostoFlete(body);

    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Error calculando costo flete:', error);
    return NextResponse.json(
      { error: 'Error interno al calcular costo', details: error.message },
      { status: 500 }
    );
  }
}