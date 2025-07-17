// app/api/superuser/notas-credito/route.js
import { NextResponse } from 'next/server';
import db from '../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const facturaId = searchParams.get('facturaId');

    const whereClause = {};
    if (facturaId) whereClause.facturaId = facturaId;

    const notasCredito = await db.NotaCredito.findAll({
      where: whereClause,
      include: [
        { model: db.Factura, as: 'factura', include: [{ model: db.Cliente, as: 'cliente' }] }, // Incluir factura y cliente asociado
        { model: db.Empleado, as: 'emitidaPor' } // Si asocias con Empleado
      ],
      order: [['fechaEmision', 'DESC']],
    });
    return NextResponse.json(notasCredito);
  } catch (error) {
    console.error('Error fetching notas de credito:', error);
    return NextResponse.json({ message: 'Error al obtener notas de crédito', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { facturaId, monto, motivo, emitidaPorId } = body;

    // Verificar que la factura exista
    const factura = await db.Factura.findByPk(facturaId, { transaction });
    if (!factura) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Factura no encontrada para aplicar la nota de crédito.' }, { status: 404 });
    }

    // Crear la nota de crédito
    const nuevaNotaCredito = await db.NotaCredito.create({
      ...body, // Asegúrate de que numeroNota se genere o venga en el body
      facturaId: parseInt(facturaId),
      monto: parseFloat(monto),
      fechaEmision: new Date(),
      estado: 'Emitida', // Estado inicial
    }, { transaction });

    // Lógica para actualizar el saldo de la factura (opcional, dependiendo de cómo manejes los saldos)
    // Esto podría implicar recalcular el total de pagos MENOS el total de notas de crédito
    // O puedes considerarlo solo un registro financiero y no afectar el estado directo de la factura.
    // Si la nota de crédito afecta el total a pagar de la factura, necesitarías recalcularlo aquí.
    // Por simplicidad, por ahora, solo la crearemos y la factura se "liquidaría" con pagos.
    // Si una Nota de Crédito 'reduce' el monto a pagar, tendrías que ajustar el 'totalAPagar' de la Factura,
    // o que los reportes de saldo consideren `Factura.totalAPagar - sum(Pagos) + sum(NotasCredito)`
    // Para no complicar el PUT de Factura, es mejor que los reportes manejen esto.

    await transaction.commit();
    return NextResponse.json(nuevaNotaCredito, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creando nota de credito:', error);
    return NextResponse.json({ message: 'Error al crear nota de crédito', error: error.message }, { status: 400 });
  }
}