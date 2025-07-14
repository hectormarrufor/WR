import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(request) {
  try {
    const cuentas = await db.CuentaBancaria.findAll({
      order: [['nombreBanco', 'ASC'], ['moneda', 'ASC']],
    });
    return NextResponse.json(cuentas);
  } catch (error) {
    console.error('Error fetching cuentas bancarias:', error);
    return NextResponse.json({ message: 'Error al obtener cuentas bancarias', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nuevaCuenta = await db.CuentaBancaria.create(body);
    return NextResponse.json(nuevaCuenta, { status: 201 });
  } catch (error) {
    console.error('Error creating cuenta bancaria:', error);
    return NextResponse.json({ message: 'Error al crear cuenta bancaria', error: error.message }, { status: 400 });
  }
}