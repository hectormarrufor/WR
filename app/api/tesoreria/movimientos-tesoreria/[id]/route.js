import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const movimiento = await db.MovimientoTesoreria.findByPk(id, {
      include: [
        { model: db.CuentaBancaria, as: 'cuentaOrigen' },
        { model: db.CuentaBancaria, as: 'cuentaDestino' },
        { model: db.OrdenCompra, as: 'ordenCompra' },
        { model: db.ContratoServicio, as: 'contratoServicio' },
        { model: db.Empleado, as: 'empleado' },
      ],
    });
    if (!movimiento) {
      return NextResponse.json({ message: 'Movimiento de tesorería no encontrado' }, { status: 404 });
    }
    return NextResponse.json(movimiento);
  } catch (error) {
    console.error('Error fetching movimiento de tesoreria:', error);
    return NextResponse.json({ message: 'Error al obtener movimiento de tesorería', error: error.message }, { status: 500 });
  }
}

// **IMPORTANTE:** Las operaciones PUT y DELETE en movimientos de tesorería son EXTREMADAMENTE delicadas.
// Requieren reversión de saldos y manejo de contabilidad. Es preferible que un movimiento
// de tesorería sea inmutable o solo se pueda "anular" creando un movimiento opuesto.
// El siguiente código es una simplificación y DEBERÍA ser revisado y reforzado.

export async function PUT(request, { params }) {
  const { id } = await params;
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const movimiento = await db.MovimientoTesoreria.findByPk(id, { transaction });

    if (!movimiento) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Movimiento de tesorería no encontrado' }, { status: 404 });
    }

    // Lógica compleja de reversión del movimiento original y aplicación del nuevo.
    // Esto es un placeholder; la lógica real sería muy compleja y propensa a errores
    // si no se maneja cuidadosamente con principios contables.
    // Se recomienda evitar la edición directa de movimientos una vez creados,
    // y en su lugar, crear "ajustes" o "reversiones".

    // Ejemplo simplificado (NO SEGURO PARA PRODUCCIÓN SIN MÁS LÓGICA CONTABLE):
    // 1. Revertir el impacto del movimiento original en las cuentas.
    // 2. Aplicar el impacto del nuevo cuerpo en las cuentas.
    // Esto es propenso a errores y data inconsistente.
    // Por simplicidad en este ejemplo, solo actualizaremos los datos del movimiento,
    // asumiendo que los saldos se manejan en un proceso contable separado o que
    // esta operación es solo para errores menores de descripción, no de monto/tipo.

    await movimiento.update(body, { transaction });
    await transaction.commit();
    return NextResponse.json(movimiento);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating movimiento de tesoreria:', error);
    return NextResponse.json({ message: 'Error al actualizar movimiento de tesorería', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const transaction = await db.sequelize.transaction();
  try {
    const movimiento = await db.MovimientoTesoreria.findByPk(id, { transaction });

    if (!movimiento) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Movimiento de tesorería no encontrado' }, { status: 404 });
    }

    // Lógica para revertir el impacto en los saldos de las cuentas bancarias.
    // Este es un ejemplo básico, la lógica real debe ser más robusta
    // y considerar el tipo de movimiento original y el impacto en las cuentas.

    const { monto, tipoMovimiento, cuentaOrigenId, cuentaDestinoId } = movimiento;

    if (tipoMovimiento === 'Ingreso' && cuentaDestinoId) {
      const cuentaDestino = await db.CuentaBancaria.findByPk(cuentaDestinoId, { transaction });
      if (cuentaDestino) {
        await cuentaDestino.update({ saldoActual: cuentaDestino.saldoActual - parseFloat(monto) }, { transaction });
      }
    } else if (tipoMovimiento === 'Egreso' && cuentaOrigenId) {
      const cuentaOrigen = await db.CuentaBancaria.findByPk(cuentaOrigenId, { transaction });
      if (cuentaOrigen) {
        await cuentaOrigen.update({ saldoActual: cuentaOrigen.saldoActual + parseFloat(monto) }, { transaction });
      }
    } else if (tipoMovimiento === 'Transferencia' && cuentaOrigenId && cuentaDestinoId) {
      const cuentaOrigen = await db.CuentaBancaria.findByPk(cuentaOrigenId, { transaction });
      const cuentaDestino = await db.CuentaBancaria.findByPk(cuentaDestinoId, { transaction });
      if (cuentaOrigen) {
        await cuentaOrigen.update({ saldoActual: cuentaOrigen.saldoActual + parseFloat(monto) }, { transaction });
      }
      if (cuentaDestino) {
        await cuentaDestino.update({ saldoActual: cuentaDestino.saldoActual - parseFloat(monto) }, { transaction });
      }
    }

    await movimiento.destroy({ transaction });
    await transaction.commit();
    return NextResponse.json({ message: 'Movimiento de tesorería eliminado exitosamente y saldos revertidos' }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting movimiento de tesoreria:', error);
    return NextResponse.json({ message: 'Error al eliminar movimiento de tesorería', error: error.message }, { status: 500 });
  }
}