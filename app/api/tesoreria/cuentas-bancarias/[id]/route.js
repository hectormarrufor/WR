import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const cuenta = await db.CuentaBancaria.findByPk(id, {
      include: [
        { model: db.MovimientoTesoreria, as: 'movimientosOrigen' },
        { model: db.MovimientoTesoreria, as: 'movimientosDestino' },
      ],
    });
    if (!cuenta) {
      return NextResponse.json({ message: 'Cuenta bancaria no encontrada' }, { status: 404 });
    }
    return NextResponse.json(cuenta);
  } catch (error) {
    console.error('Error fetching cuenta bancaria:', error);
    return NextResponse.json({ message: 'Error al obtener cuenta bancaria', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const cuenta = await db.CuentaBancaria.findByPk(id);
    if (!cuenta) {
      return NextResponse.json({ message: 'Cuenta bancaria no encontrada' }, { status: 404 });
    }
    // No permitir actualizar el saldo directamente aquí, debe ser a través de MovimientosTesoreria
    delete body.saldoActual;
    await cuenta.update(body);
    return NextResponse.json(cuenta);
  } catch (error) {
    console.error('Error updating cuenta bancaria:', error);
    return NextResponse.json({ message: 'Error al actualizar cuenta bancaria', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const cuenta = await db.CuentaBancaria.findByPk(id);
    if (!cuenta) {
      return NextResponse.json({ message: 'Cuenta bancaria no encontrada' }, { status: 404 });
    }
    // Considerar si la cuenta tiene movimientos asociados antes de borrar
    await cuenta.destroy();
    return NextResponse.json({ message: 'Cuenta bancaria eliminada exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting cuenta bancaria:', error);
    return NextResponse.json({ message: 'Error al eliminar cuenta bancaria', error: error.message }, { status: 500 });
  }
}