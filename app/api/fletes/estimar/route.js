import { NextResponse } from 'next/server';
import calcularCostoFlete from '@/lib/estimacion/calcularCostoFlete';

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