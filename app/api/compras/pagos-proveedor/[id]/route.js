// app/api/superuser/compras/pagos-proveedor/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const pagoProveedor = await db.PagoProveedor.findByPk(id, {
      include: [
        { model: db.FacturaProveedor, as: 'facturaProveedor', include: [db.Proveedor, db.OrdenCompra] },
        { model: db.CuentaBancaria, as: 'cuentaBancaria' },
        { model: db.Empleado, as: 'registradoPor' },
        { model: db.MovimientoTesoreria, as: 'movimientoTesoreria' },
      ],
    });

    if (!pagoProveedor) {
      return NextResponse.json({ message: 'Pago de Proveedor no encontrado' }, { status: 404 });
    }
    return NextResponse.json(pagoProveedor);
  } catch (error) {
    console.error('Error fetching pago de proveedor:', error);
    return NextResponse.json({ message: 'Error al obtener pago de proveedor', error: error.message }, { status: 500 });
  }
}

// No hay PUT para pagos por complejidad de reversión/auditoría

export async function DELETE(request, { params }) {
  const { id } = await params;
  const transaction = await db.sequelize.transaction();
  try {
    const pagoProveedor = await db.PagoProveedor.findByPk(id, {
      include: [
        { model: db.FacturaProveedor, as: 'facturaProveedor' },
        { model: db.MovimientoTesoreria, as: 'movimientoTesoreria' }
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!pagoProveedor) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Pago de Proveedor no encontrado.' }, { status: 404 });
    }

    const facturaProveedor = pagoProveedor.facturaProveedor;
    const montoPago = parseFloat(pagoProveedor.monto);

    // 1. Revertir el monto en la FacturaProveedor
    if (facturaProveedor) {
      const currentMontoPagado = parseFloat(facturaProveedor.montoPagado);
      facturaProveedor.montoPagado = (currentMontoPagado - montoPago).toFixed(2);

      // Ajustar el estado de la factura
      if (facturaProveedor.montoPagado <= 0) {
        facturaProveedor.estado = 'Pendiente';
      } else if (parseFloat(facturaProveedor.montoPagado) < parseFloat(facturaProveedor.totalAPagar)) {
        facturaProveedor.estado = 'Parcialmente Pagada';
      }
      await facturaProveedor.save({ transaction });
    }

    // 2. Eliminar el MovimientoTesoreria asociado
    if (pagoProveedor.movimientoTesoreriaId) {
      await db.MovimientoTesoreria.destroy({
        where: { id: pagoProveedor.movimientoTesoreriaId },
        transaction,
      });
    }

    // 3. Eliminar el PagoProveedor
    await pagoProveedor.destroy({ transaction });

    await transaction.commit();
    return NextResponse.json({ message: 'Pago de proveedor eliminado y montos revertidos exitosamente.' }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting pago de proveedor:', error);
    return NextResponse.json({ message: 'Error al eliminar pago de proveedor', error: error.message }, { status: 500 });
  }
}