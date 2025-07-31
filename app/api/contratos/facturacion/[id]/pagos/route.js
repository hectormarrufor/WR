// app/api/superuser/facturacion/[id]/pagos/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../../models';

export async function POST(request, { params }) {
  const { id: facturaId } = await params; // El ID de la factura es el parámetro de la URL
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { monto, fechaPago, metodoPago, referencia } = body;

    // Verificar que la factura exista
    const factura = await db.Factura.findByPk(facturaId, { transaction });
    if (!factura) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Factura no encontrada.' }, { status: 404 });
    }

    // Crear el nuevo pago
    const nuevoPago = await db.PagoFactura.create({
      facturaId: parseInt(facturaId),
      monto: parseFloat(monto),
      fechaPago: fechaPago, // Ya viene en formato de fecha ISO
      metodoPago: metodoPago,
      referencia: referencia,
    }, { transaction });

    // Lógica para actualizar el estado de la factura si está completamente pagada
    // Se recomienda recalcular el saldo actual de la factura
    const pagosDeFactura = await db.PagoFactura.findAll({
      where: { facturaId: factura.id },
      attributes: [[db.sequelize.fn('SUM', db.sequelize.col('monto')), 'totalPagado']],
      raw: true, // Para obtener el resultado como objeto plano
      transaction // Importante para que use la misma transacción
    });

    const totalPagadoActual = parseFloat(pagosDeFactura[0]?.totalPagado || 0);
    const totalAPagar = parseFloat(factura.totalAPagar);

    let nuevoEstadoFactura = factura.estado;
    if (totalPagadoActual >= totalAPagar) {
      nuevoEstadoFactura = 'Pagada';
    } else if (totalPagadoActual > 0 && totalPagadoActual < totalAPagar) {
      nuevoEstadoFactura = 'Parcialmente Pagada'; // Puedes añadir este estado si lo manejas
    } else if (totalPagadoActual === 0 && new Date() > new Date(factura.fechaVencimiento)) {
      nuevoEstadoFactura = 'Vencida'; // Revertir a vencida si no hay pagos y ya se venció
    } else {
      nuevoEstadoFactura = 'Pendiente'; // O cualquier otro estado predeterminado
    }

    if (factura.estado !== nuevoEstadoFactura) {
      await factura.update({ estado: nuevoEstadoFactura }, { transaction });
    }

    await transaction.commit(); // Confirmar la transacción
    return NextResponse.json(nuevoPago, { status: 201 });
  } catch (error) {
    await transaction.rollback(); // Revertir la transacción
    console.error('Error registrando pago:', error);
    return NextResponse.json({ message: 'Error al registrar pago', error: error.message }, { status: 400 });
  }
}

export async function GET(request, { params }) {
  const { id: facturaId } = await params;
  try {
    const pagos = await db.PagoFactura.findAll({
      where: { facturaId: facturaId },
      order: [['fechaPago', 'ASC']],
    });
    return NextResponse.json(pagos);
  } catch (error) {
    console.error('Error fetching pagos for factura:', error);
    return NextResponse.json({ message: 'Error al obtener pagos', error: error.message }, { status: 500 });
  }
}

// Puedes añadir PUT y DELETE para pagos individuales si es necesario,
// pero por lo general, los pagos se manejan como registros inmutables o se anulan con notas de crédito.