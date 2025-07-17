import { NextResponse } from 'next/server';
import db from '../../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipoMovimiento = searchParams.get('tipoMovimiento');
    const categoria = searchParams.get('categoria');
    const cuentaId = searchParams.get('cuentaId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    const whereClause = {};
    if (tipoMovimiento) whereClause.tipoMovimiento = tipoMovimiento;
    if (categoria) whereClause.categoria = categoria;
    if (fechaDesde && fechaHasta) {
      whereClause.fechaMovimiento = { [db.Sequelize.Op.between]: [new Date(fechaDesde), new Date(fechaHasta)] };
    } else if (fechaDesde) {
      whereClause.fechaMovimiento = { [db.Sequelize.Op.gte]: new Date(fechaDesde) };
    } else if (fechaHasta) {
      whereClause.fechaMovimiento = { [db.Sequelize.Op.lte]: new Date(fechaHasta) };
    }

    if (cuentaId) {
      // Si se filtra por una cuenta, el movimiento debe ser de origen O destino para esa cuenta
      whereClause[db.Sequelize.Op.or] = [
        { cuentaOrigenId: cuentaId },
        { cuentaDestinoId: cuentaId }
      ];
    }

    const movimientos = await db.MovimientoTesoreria.findAll({
      where: whereClause,
      include: [
        { model: db.CuentaBancaria, as: 'cuentaOrigen' },
        { model: db.CuentaBancaria, as: 'cuentaDestino' },
        { model: db.OrdenCompra, as: 'ordenCompra' },
        { model: db.ContratoServicio, as: 'contratoServicio' },
        { model: db.Empleado, as: 'empleado' },
      ],
      order: [['fechaMovimiento', 'DESC']],
    });
    return NextResponse.json(movimientos);
  } catch (error) {
    console.error('Error fetching movimientos de tesoreria:', error);
    return NextResponse.json({ message: 'Error al obtener movimientos de tesorería', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { monto, tipoMovimiento, cuentaOrigenId, cuentaDestinoId, ...rest } = body;

    // Validar que el monto sea positivo
    if (parseFloat(monto) <= 0) {
      await transaction.rollback();
      return NextResponse.json({ message: 'El monto debe ser un valor positivo.' }, { status: 400 });
    }

    let cuentaOrigen, cuentaDestino;

    if (tipoMovimiento === 'Ingreso') {
      if (!cuentaDestinoId) {
        await transaction.rollback();
        return NextResponse.json({ message: 'Para un ingreso, se requiere una cuenta de destino.' }, { status: 400 });
      }
      cuentaDestino = await db.CuentaBancaria.findByPk(cuentaDestinoId, { transaction });
      if (!cuentaDestino) {
        await transaction.rollback();
        return NextResponse.json({ message: 'Cuenta de destino no encontrada.' }, { status: 404 });
      }
      await cuentaDestino.update({ saldoActual: cuentaDestino.saldoActual + parseFloat(monto) }, { transaction });

    } else if (tipoMovimiento === 'Egreso') {
      if (!cuentaOrigenId) {
        await transaction.rollback();
        return NextResponse.json({ message: 'Para un egreso, se requiere una cuenta de origen.' }, { status: 400 });
      }
      cuentaOrigen = await db.CuentaBancaria.findByPk(cuentaOrigenId, { transaction });
      if (!cuentaOrigen) {
        await transaction.rollback();
        return NextResponse.json({ message: 'Cuenta de origen no encontrada.' }, { status: 404 });
      }
      if (cuentaOrigen.saldoActual < parseFloat(monto)) {
        await transaction.rollback();
        return NextResponse.json({ message: 'Saldo insuficiente en la cuenta de origen.' }, { status: 400 });
      }
      await cuentaOrigen.update({ saldoActual: cuentaOrigen.saldoActual - parseFloat(monto) }, { transaction });

    } else if (tipoMovimiento === 'Transferencia') {
      if (!cuentaOrigenId || !cuentaDestinoId) {
        await transaction.rollback();
        return NextResponse.json({ message: 'Para una transferencia, se requieren cuentas de origen y destino.' }, { status: 400 });
      }
      if (cuentaOrigenId === cuentaDestinoId) {
          await transaction.rollback();
          return NextResponse.json({ message: 'Las cuentas de origen y destino no pueden ser las mismas para una transferencia.' }, { status: 400 });
      }
      cuentaOrigen = await db.CuentaBancaria.findByPk(cuentaOrigenId, { transaction });
      cuentaDestino = await db.CuentaBancaria.findByPk(cuentaDestinoId, { transaction });

      if (!cuentaOrigen || !cuentaDestino) {
        await transaction.rollback();
        return NextResponse.json({ message: 'Una o ambas cuentas no encontradas.' }, { status: 404 });
      }
      if (cuentaOrigen.saldoActual < parseFloat(monto)) {
        await transaction.rollback();
        return NextResponse.json({ message: 'Saldo insuficiente en la cuenta de origen para la transferencia.' }, { status: 400 });
      }

      await cuentaOrigen.update({ saldoActual: cuentaOrigen.saldoActual - parseFloat(monto) }, { transaction });
      await cuentaDestino.update({ saldoActual: cuentaDestino.saldoActual + parseFloat(monto) }, { transaction });

    } else {
      await transaction.rollback();
      return NextResponse.json({ message: 'Tipo de movimiento no válido.' }, { status: 400 });
    }

    const nuevoMovimiento = await db.MovimientoTesoreria.create({
      monto,
      tipoMovimiento,
      cuentaOrigenId,
      cuentaDestinoId,
      ...rest,
    }, { transaction });

    await transaction.commit();
    return NextResponse.json(nuevoMovimiento, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating movimiento de tesoreria:', error);
    return NextResponse.json({ message: 'Error al crear movimiento de tesorería', error: error.message }, { status: 400 });
  }
}