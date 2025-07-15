// app/api/superuser/compras/pagos-proveedor/route.js
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import db from '../../../../models';


export async function POST(request) {
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { facturaProveedorId, monto, fechaPago, metodoPago, referenciaPago, cuentaBancariaId, registradoPorId, notas } = body;

    if (!facturaProveedorId || !monto || !fechaPago || !metodoPago) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Factura, monto, fecha y método de pago son requeridos.' }, { status: 400 });
    }

    const facturaProveedor = await db.FacturaProveedor.findByPk(facturaProveedorId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!facturaProveedor) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Factura de Proveedor no encontrada.' }, { status: 404 });
    }

    const parsedMonto = parseFloat(monto);
    const totalAPagar = parseFloat(facturaProveedor.totalAPagar);
    const montoPagadoActual = parseFloat(facturaProveedor.montoPagado);

    if (parsedMonto <= 0) {
      await transaction.rollback();
      return NextResponse.json({ message: 'El monto del pago debe ser mayor a cero.' }, { status: 400 });
    }
    if (montoPagadoActual + parsedMonto > totalAPagar) {
      await transaction.rollback();
      return NextResponse.json({ message: `El monto del pago excede el saldo pendiente (${totalAPagar - montoPagadoActual}).` }, { status: 400 });
    }
    if (facturaProveedor.estado === 'Pagada' || facturaProveedor.estado === 'Anulada') {
        await transaction.rollback();
        return NextResponse.json({ message: `No se pueden registrar pagos para una factura en estado "${facturaProveedor.estado}".` }, { status: 400 });
    }

    // 1. Crear el PagoProveedor
    const nuevoPagoProveedor = await db.PagoProveedor.create({
      facturaProveedorId: parseInt(facturaProveedorId),
      monto: parsedMonto.toFixed(2),
      fechaPago,
      metodoPago,
      referenciaPago,
      cuentaBancariaId: cuentaBancariaId ? parseInt(cuentaBancariaId) : null,
      registradoPorId: registradoPorId ? parseInt(registradoPorId) : null,
      notas,
    }, { transaction });

    // 2. Crear MovimientoTesoreria (Egreso)
    const movimientoTesoreria = await db.MovimientoTesoreria.create({
      cuentaOrigenId: cuentaBancariaId ? parseInt(cuentaBancariaId) : null, // Asume que el pago es un egreso de esta cuenta
      tipoMovimiento: 'Egreso',
      monto: parsedMonto.toFixed(2),
      fecha: fechaPago,
      descripcion: `Pago de factura a proveedor ${facturaProveedor.numeroFactura}`,
      categoria: 'Compra', // O 'Pago a Proveedor' si tienes esa categoría
      empleadoId: registradoPorId ? parseInt(registradoPorId) : null,
      pagoProveedorId: nuevoPagoProveedor.id, // Enlazar con el pago
      // Puedes añadir más referencias si el movimiento es por OC o Recepción
    }, { transaction });

    // Actualizar el pago con el ID del movimiento de tesorería
    await nuevoPagoProveedor.update({ movimientoTesoreriaId: movimientoTesoreria.id }, { transaction });

    // 3. Actualizar la FacturaProveedor
    facturaProveedor.montoPagado = (montoPagadoActual + parsedMonto).toFixed(2);
    if (parseFloat(facturaProveedor.montoPagado) >= totalAPagar) {
      facturaProveedor.estado = 'Pagada';
    } else {
      facturaProveedor.estado = 'Parcialmente Pagada';
    }
    await facturaProveedor.save({ transaction });

    await transaction.commit();

    const pagoConDetalles = await db.PagoProveedor.findByPk(nuevoPagoProveedor.id, {
      include: [
        { model: db.FacturaProveedor, as: 'facturaProveedor', include: [db.Proveedor] },
        { model: db.CuentaBancaria, as: 'cuentaBancaria' },
        { model: db.Empleado, as: 'registradoPor' },
        { model: db.MovimientoTesoreria, as: 'movimientoTesoreria' },
      ],
    });

    return NextResponse.json(pagoConDetalles, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error registrando pago a proveedor:', error);
    return NextResponse.json({ message: 'Error al registrar pago a proveedor', error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const facturaProveedorId = searchParams.get('facturaProveedorId'); // Para filtrar por factura
        const proveedorId = searchParams.get('proveedorId');
        const query = searchParams.get('query'); // Para búsqueda general

        const whereClause = {};
        if (facturaProveedorId) {
            whereClause.facturaProveedorId = parseInt(facturaProveedorId);
        }
        if (proveedorId) {
            whereClause['$facturaProveedor.proveedorId$'] = parseInt(proveedorId); // Filtrar por proveedor a través de la factura
        }
        if (query) {
            whereClause[Op.or] = [
                { referenciaPago: { [Op.like]: `%${query}%` } },
                { '$facturaProveedor.numeroFactura$': { [Op.like]: `%${query}%` } },
                { '$facturaProveedor.proveedor.nombre$': { [Op.like]: `%${query}%` } },
            ];
        }

        const pagos = await db.PagoProveedor.findAll({
            where: whereClause,
            include: [
                { model: db.FacturaProveedor, as: 'facturaProveedor', include: [db.Proveedor] },
                { model: db.CuentaBancaria, as: 'cuentaBancaria' },
                { model: db.Empleado, as: 'registradoPor' },
            ],
            order: [['fechaPago', 'DESC'], ['createdAt', 'DESC']],
        });
        return NextResponse.json(pagos);
    } catch (error) {
        console.error('Error fetching pagos a proveedor:', error);
        return NextResponse.json({ message: 'Error al obtener pagos a proveedor', error: error.message }, { status: 500 });
    }
}