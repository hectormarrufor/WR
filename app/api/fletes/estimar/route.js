import { NextResponse } from 'next/server';
import db from '@/models';
import { calcularFlete } from '@/app/helpers/estimacionFlete';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // body debe tener: { activoPrincipalId, destinoCoords, tonelaje, tipoCarga, choferId, ayudanteId?, fechaSalida }
    const resultado = await calcularFlete(body);

    return NextResponse.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error calculando flete:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}