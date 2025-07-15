// app/api/superuser/compras/facturas-proveedor/[id]/route.js
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import db from '../../../../../models';


export async function GET(request, { params }) {
  const { id } = params;
  try {
    const facturaProveedor = await db.FacturaProveedor.findByPk(id, {
      include: [
        { model: db.Proveedor, as: 'proveedor' },
        { model: db.OrdenCompra, as: 'ordenCompra' },
        { model: db.DetalleFacturaProveedor, as: 'detalles', include: [db.Consumible] },
        { model: db.PagoProveedor, as: 'pagos' }, // Incluir pagos asociados
      ],
    });

    if (!facturaProveedor) {
      return NextResponse.json({ message: 'Factura de Proveedor no encontrada' }, { status: 404 });
    }
    return NextResponse.json(facturaProveedor);
  } catch (error) {
    console.error('Error fetching factura de proveedor:', error);
    return NextResponse.json({ message: 'Error al obtener factura de proveedor', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { proveedorId, ordenCompraId, numeroFactura, fechaEmision, fechaVencimiento,
            fechaRecepcionFactura, notas, estado, detalles } = body;

    const facturaProveedor = await db.FacturaProveedor.findByPk(id, {
      include: [{ model: db.DetalleFacturaProveedor, as: 'detalles' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!facturaProveedor) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Factura de Proveedor no encontrada.' }, { status: 404 });
    }

    // Si el estado cambia a 'Anulada', hay que revertir montos en OC y marcar pagos como anulados/revertidos.
    // Esto es complejo y requeriría anular los pagos y posiblemente crear un movimiento de reversión.
    // Para simplificar, si el estado es Anulada y no lo era, se podría evitar la edición de detalles.
    if (estado === 'Anulada' && facturaProveedor.estado !== 'Anulada') {
        // Lógica de anulación:
        // 1. Marcar pagos como anulados o revertir MovimientosTesoreria (requiere más lógica)
        // 2. Revertir `montoFacturado` en la Orden de Compra si aplica.
        // 3. Revertir `cantidadFacturada` en `DetalleOrdenCompra`.
        // Para esta implementación inicial, vamos a asumir que anular es solo cambiar el estado.
        // Un sistema completo requeriría que los pagos también se anulen o se creen notas de crédito.
    }


    // Calcular nuevos montos totales de la factura
    let newSubtotal = 0;
    let newImpuestos = 0;

    for (const item of detalles) {
        const cantidad = parseFloat(item.cantidadFacturada);
        const precioUnitario = parseFloat(item.precioUnitarioFacturado);
        const itemSubtotal = cantidad * precioUnitario;
        const itemImpuestos = parseFloat(item.impuestos || 0);

        newSubtotal += itemSubtotal;
        newImpuestos += itemImpuestos;
    }
    const newMontoTotal = newSubtotal + newImpuestos;

    // Actualizar FacturaProveedor
    await facturaProveedor.update({
      proveedorId: parseInt(proveedorId || facturaProveedor.proveedorId),
      ordenCompraId: ordenCompraId ? parseInt(ordenCompraId) : null,
      numeroFactura: numeroFactura || facturaProveedor.numeroFactura,
      fechaEmision: fechaEmision || facturaProveedor.fechaEmision,
      fechaVencimiento: fechaVencimiento || facturaProveedor.fechaVencimiento,
      fechaRecepcionFactura: fechaRecepcionFactura || facturaProveedor.fechaRecepcionFactura,
      subtotal: newSubtotal.toFixed(2),
      impuestos: newImpuestos.toFixed(2),
      montoTotal: newMontoTotal.toFixed(2),
      totalAPagar: (newMontoTotal - parseFloat(facturaProveedor.montoPagado)).toFixed(2), // Actualizar total a pagar
      estado: estado || facturaProveedor.estado,
      notas: notas || facturaProveedor.notas,
    }, { transaction });

    // Actualizar o crear/eliminar detalles
    // Lógica para sincronizar detalles (compleja)
    // 1. Identificar detalles existentes, nuevos y eliminados.
    // 2. Revertir cambios de los detalles eliminados en OC.
    // 3. Actualizar los existentes.
    // 4. Crear los nuevos.

    const existingDetailIds = new Set(facturaProveedor.detalles.map(d => d.id));
    const incomingDetailIds = new Set(detalles.filter(d => d.id).map(d => d.id));

    const detailsToDelete = facturaProveedor.detalles.filter(d => !incomingDetailIds.has(d.id));
    const detailsToCreate = detalles.filter(d => !d.id);
    const detailsToUpdate = detalles.filter(d => d.id && existingDetailIds.has(d.id));

    // Revertir y eliminar detalles antiguos
    for (const detail of detailsToDelete) {
        if (detail.detalleOrdenCompraId) {
            const ocDetalle = await db.DetalleOrdenCompra.findByPk(detail.detalleOrdenCompraId, { transaction });
            if (ocDetalle) {
                ocDetalle.cantidadFacturada = (parseFloat(ocDetalle.cantidadFacturada) - parseFloat(detail.cantidadFacturada)).toFixed(2);
                ocDetalle.facturadoCompletamente = false;
                await ocDetalle.save({ transaction });
            }
        }
        await detail.destroy({ transaction });
    }

    // Actualizar detalles existentes
    for (const item of detailsToUpdate) {
        const existingDetail = facturaProveedor.detalles.find(d => d.id === item.id);
        const oldCantidad = parseFloat(existingDetail.cantidadFacturada);
        const newCantidad = parseFloat(item.cantidadFacturada);

        const itemSubtotal = newCantidad * parseFloat(item.precioUnitarioFacturado);
        const itemImpuestos = parseFloat(item.impuestos || 0);
        const itemTotal = itemSubtotal + itemImpuestos;

        await existingDetail.update({
            consumibleId: parseInt(item.consumibleId),
            cantidadFacturada: newCantidad.toFixed(2),
            precioUnitarioFacturado: parseFloat(item.precioUnitarioFacturado).toFixed(2),
            subtotal: itemSubtotal.toFixed(2),
            impuestos: itemImpuestos.toFixed(2),
            total: itemTotal.toFixed(2),
            detalleOrdenCompraId: item.detalleOrdenCompraId ? parseInt(item.detalleOrdenCompraId) : null,
            detalleRecepcionCompraId: item.detalleRecepcionCompraId ? parseInt(item.detalleRecepcionCompraId) : null,
            notas: item.notas,
        }, { transaction });

        // Actualizar DetalleOrdenCompra
        if (existingDetail.detalleOrdenCompraId) {
            const ocDetalle = await db.DetalleOrdenCompra.findByPk(existingDetail.detalleOrdenCompraId, { transaction });
            if (ocDetalle) {
                ocDetalle.cantidadFacturada = (parseFloat(ocDetalle.cantidadFacturada) - oldCantidad + newCantidad).toFixed(2);
                ocDetalle.facturadoCompletamente = (parseFloat(ocDetalle.cantidadFacturada) >= parseFloat(ocDetalle.cantidad));
                await ocDetalle.save({ transaction });
            }
        }
    }

    // Crear nuevos detalles
    for (const item of detailsToCreate) {
        const itemSubtotal = parseFloat(item.cantidadFacturada) * parseFloat(item.precioUnitarioFacturado);
        const itemImpuestos = parseFloat(item.impuestos || 0);
        const itemTotal = itemSubtotal + itemImpuestos;

        const nuevoDetalle = await db.DetalleFacturaProveedor.create({
            facturaProveedorId: facturaProveedor.id,
            consumibleId: parseInt(item.consumibleId),
            cantidadFacturada: parseFloat(item.cantidadFacturada).toFixed(2),
            precioUnitarioFacturado: parseFloat(item.precioUnitarioFacturado).toFixed(2),
            subtotal: itemSubtotal.toFixed(2),
            impuestos: itemImpuestos.toFixed(2),
            total: itemTotal.toFixed(2),
            detalleOrdenCompraId: item.detalleOrdenCompraId ? parseInt(item.detalleOrdenCompraId) : null,
            detalleRecepcionCompraId: item.detalleRecepcionCompraId ? parseInt(item.detalleRecepcionCompraId) : null,
            notas: item.notas,
        }, { transaction });

        // Actualizar DetalleOrdenCompra
        if (item.detalleOrdenCompraId) {
            const ocDetalle = await db.DetalleOrdenCompra.findByPk(item.detalleOrdenCompraId, { transaction });
            if (ocDetalle) {
                ocDetalle.cantidadFacturada = (parseFloat(ocDetalle.cantidadFacturada) + parseFloat(item.cantidadFacturada)).toFixed(2);
                ocDetalle.facturadoCompletamente = (parseFloat(ocDetalle.cantidadFacturada) >= parseFloat(ocDetalle.cantidad));
                await ocDetalle.save({ transaction });
            }
        }
    }

    // Actualizar la Orden de Compra (montoFacturado, estado facturada)
    if (facturaProveedor.ordenCompraId) {
        const oc = await db.OrdenCompra.findByPk(facturaProveedor.ordenCompraId, {
            include: [{ model: db.DetalleOrdenCompra, as: 'detalles' }],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (oc) {
            // Recalcular montoFacturado sumando todas las facturas de proveedor de esta OC
            const todasFacturasOC = await db.FacturaProveedor.findAll({
                where: { ordenCompraId: oc.id, estado: { [Op.ne]: 'Anulada' } },
                attributes: [[db.sequelize.fn('SUM', db.sequelize.col('totalAPagar')), 'totalFacturado']],
                transaction,
            });
            oc.montoFacturado = (todasFacturasOC[0].getDataValue('totalFacturado') || 0).toFixed(2);

            // Determinar si la OC está completamente facturada
            const allOcDetailsFacturado = oc.detalles.every(d => d.facturadoCompletamente);
            oc.facturada = allOcDetailsFacturado;
            await oc.save({ transaction });
        }
    }


    await transaction.commit();

    const updatedFactura = await db.FacturaProveedor.findByPk(id, {
      include: [
        { model: db.Proveedor, as: 'proveedor' },
        { model: db.OrdenCompra, as: 'ordenCompra' },
        { model: db.DetalleFacturaProveedor, as: 'detalles', include: [db.Consumible] },
        { model: db.PagoProveedor, as: 'pagos' },
      ],
    });

    return NextResponse.json(updatedFactura);
  } catch (error) {
    await transaction.rollback();
    console.error('Error actualizando factura de proveedor:', error);
    return NextResponse.json({ message: 'Error al actualizar factura de proveedor', error: error.message }, { status: 400 });
  }
}


export async function DELETE(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction();
  try {
    const facturaProveedor = await db.FacturaProveedor.findByPk(id, {
      include: [
        { model: db.DetalleFacturaProveedor, as: 'detalles' },
        { model: db.PagoProveedor, as: 'pagos' },
        { model: db.OrdenCompra, as: 'ordenCompra', include: [{ model: db.DetalleOrdenCompra, as: 'detalles' }] },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!facturaProveedor) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Factura de Proveedor no encontrada' }, { status: 404 });
    }

    if (facturaProveedor.estado !== 'Pendiente' && facturaProveedor.montoPagado > 0) {
        // Si ya hay pagos registrados, la eliminación es más compleja.
        // Idealmente, se anularían los pagos o se requeriría una Nota de Crédito.
        // Aquí solo permitiremos eliminar si no hay pagos o el estado es Pendiente.
        await transaction.rollback();
        return NextResponse.json({ message: 'No se puede eliminar una factura de proveedor con pagos registrados o en estado distinto a Pendiente. Considere anularla si es necesario.' }, { status: 400 });
    }

    // 1. Revertir montos en OrdenCompra y DetalleOrdenCompra
    if (facturaProveedor.ordenCompraId) {
        const oc = facturaProveedor.ordenCompra;
        if (oc) {
            oc.montoFacturado = (parseFloat(oc.montoFacturado) - parseFloat(facturaProveedor.montoTotal)).toFixed(2);
            oc.facturada = false; // Ya no está completamente facturada
            await oc.save({ transaction });

            for (const detalleFactura of facturaProveedor.detalles) {
                if (detalleFactura.detalleOrdenCompraId) {
                    const ocDetalle = oc.detalles.find(d => d.id === detalleFactura.detalleOrdenCompraId);
                    if (ocDetalle) {
                        ocDetalle.cantidadFacturada = (parseFloat(ocDetalle.cantidadFacturada) - parseFloat(detalleFactura.cantidadFacturada)).toFixed(2);
                        ocDetalle.facturadoCompletamente = false;
                        await ocDetalle.save({ transaction });
                    }
                }
            }
        }
    }

    // 2. Eliminar pagos asociados (si los hay y están permitidos)
    await db.PagoProveedor.destroy({
        where: { facturaProveedorId: facturaProveedor.id },
        transaction,
    });

    // 3. Eliminar la FacturaProveedor y sus detalles
    await facturaProveedor.destroy({ transaction });

    await transaction.commit();
    return NextResponse.json({ message: 'Factura de Proveedor eliminada exitosamente y montos revertidos.' }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting factura de proveedor:', error);
    return NextResponse.json({ message: 'Error al eliminar factura de proveedor', error: error.message }, { status: 500 });
  }
}