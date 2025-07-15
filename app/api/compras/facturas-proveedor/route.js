// app/api/superuser/compras/facturas-proveedor/route.js
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import db from '../../../../models';


export async function POST(request) {
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { proveedorId, ordenCompraId, numeroFactura, fechaEmision, fechaVencimiento,
            fechaRecepcionFactura, notas, detalles } = body;

    if (!proveedorId || !numeroFactura || !fechaEmision || !fechaVencimiento || !fechaRecepcionFactura || !detalles || detalles.length === 0) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Todos los campos obligatorios y al menos un detalle son requeridos.' }, { status: 400 });
    }

    // Calcular montos totales
    let subtotalCalculado = 0;
    let impuestosCalculados = 0;

    for (const item of detalles) {
      const cantidad = parseFloat(item.cantidadFacturada);
      const precioUnitario = parseFloat(item.precioUnitarioFacturado);
      const itemSubtotal = cantidad * precioUnitario;
      const itemImpuestos = parseFloat(item.impuestos || 0); // Si los impuestos son por item

      subtotalCalculado += itemSubtotal;
      impuestosCalculados += itemImpuestos;
    }

    const montoTotalFactura = subtotalCalculado + impuestosCalculados;

    // Crear la FacturaProveedor
    const nuevaFacturaProveedor = await db.FacturaProveedor.create({
      proveedorId: parseInt(proveedorId),
      ordenCompraId: ordenCompraId ? parseInt(ordenCompraId) : null,
      numeroFactura,
      fechaEmision,
      fechaVencimiento,
      fechaRecepcionFactura,
      subtotal: subtotalCalculado.toFixed(2),
      impuestos: impuestosCalculados.toFixed(2),
      montoTotal: montoTotalFactura.toFixed(2), // montoTotal es subtotal + impuestos
      totalAPagar: montoTotalFactura.toFixed(2), // Al inicio, el total a pagar es el monto total
      estado: 'Pendiente',
      notas,
    }, { transaction });

    // Procesar detalles
    const detallesFacturaCreados = [];
    let ocToUpdate = null; // Para la OC si se especifica

    if (ordenCompraId) {
        ocToUpdate = await db.OrdenCompra.findByPk(ordenCompraId, {
            include: [{ model: db.DetalleOrdenCompra, as: 'detalles' }],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!ocToUpdate) {
            throw new Error('Orden de Compra asociada no encontrada.');
        }
    }

    for (const item of detalles) {
      const { consumibleId, cantidadFacturada, precioUnitarioFacturado, impuestos: itemImpuestos,
              detalleOrdenCompraId, detalleRecepcionCompraId, notas: detalleNotas } = item;

      const itemSubtotal = parseFloat(cantidadFacturada) * parseFloat(precioUnitarioFacturado);
      const itemTotal = itemSubtotal + parseFloat(itemImpuestos || 0);

      const nuevoDetalleFactura = await db.DetalleFacturaProveedor.create({
        facturaProveedorId: nuevaFacturaProveedor.id,
        consumibleId: parseInt(consumibleId),
        cantidadFacturada: parseFloat(cantidadFacturada).toFixed(2),
        precioUnitarioFacturado: parseFloat(precioUnitarioFacturado).toFixed(2),
        subtotal: itemSubtotal.toFixed(2),
        impuestos: parseFloat(itemImpuestos || 0).toFixed(2),
        total: itemTotal.toFixed(2),
        detalleOrdenCompraId: detalleOrdenCompraId ? parseInt(detalleOrdenCompraId) : null,
        detalleRecepcionCompraId: detalleRecepcionCompraId ? parseInt(detalleRecepcionCompraId) : null,
        notas: detalleNotas,
      }, { transaction });
      detallesFacturaCreados.push(nuevoDetalleFactura);

      // Actualizar cantidad facturada en DetalleOrdenCompra si aplica
      if (ocToUpdate && detalleOrdenCompraId) {
          const ocDetalle = ocToUpdate.detalles.find(d => d.id === parseInt(detalleOrdenCompraId));
          if (ocDetalle) {
              const currentFacturado = parseFloat(ocDetalle.cantidadFacturada || 0);
              ocDetalle.cantidadFacturada = (currentFacturado + parseFloat(cantidadFacturada)).toFixed(2);
              if (parseFloat(ocDetalle.cantidadFacturada) >= parseFloat(ocDetalle.cantidad)) {
                  ocDetalle.facturadoCompletamente = true;
              }
              await ocDetalle.save({ transaction });
          }
      }
    }

    // Actualizar estado de la Orden de Compra si se facturó completamente
    if (ocToUpdate) {
        let ocTotalFacturado = parseFloat(ocToUpdate.montoFacturado || 0);
        ocTotalFacturado += montoTotalFactura;
        ocToUpdate.montoFacturado = ocTotalFacturado.toFixed(2);

        // Si todos los detalles de la OC están facturados completamente
        const allOcDetailsFacturado = ocToUpdate.detalles.every(d => d.facturadoCompletamente);
        if (allOcDetailsFacturado) {
            ocToUpdate.facturada = true;
            // Podrías cambiar el estado de la OC a 'Facturada Completa' si lo tienes
        }
        await ocToUpdate.save({ transaction });
    }


    await transaction.commit();

    const facturaConDetalles = await db.FacturaProveedor.findByPk(nuevaFacturaProveedor.id, {
      include: [
        { model: db.Proveedor, as: 'proveedor' },
        { model: db.OrdenCompra, as: 'ordenCompra' },
        { model: db.DetalleFacturaProveedor, as: 'detalles', include: [db.Consumible] },
      ],
    });

    return NextResponse.json(facturaConDetalles, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creando factura de proveedor:', error);
    return NextResponse.json({ message: 'Error al crear factura de proveedor', error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query'); // Para búsquedas por número de factura, proveedor, etc.
        const proveedorId = searchParams.get('proveedorId');
        const estado = searchParams.get('estado');
        const ordenCompraId = searchParams.get('ordenCompraId');

        const whereClause = {};
        if (query) {
            whereClause[Op.or] = [
                { numeroFactura: { [Op.like]: `%${query}%` } },
                { '$proveedor.nombre$': { [Op.like]: `%${query}%` } },
                { '$ordenCompra.numeroOrden$': { [Op.like]: `%${query}%` } },
            ];
        }
        if (proveedorId) {
            whereClause.proveedorId = parseInt(proveedorId);
        }
        if (estado) {
            whereClause.estado = estado;
        }
        if (ordenCompraId) {
            whereClause.ordenCompraId = parseInt(ordenCompraId);
        }

        const facturas = await db.FacturaProveedor.findAll({
            where: whereClause,
            include: [
                { model: db.Proveedor, as: 'proveedor' },
                { model: db.OrdenCompra, as: 'ordenCompra' },
            ],
            order: [['fechaEmision', 'DESC'], ['createdAt', 'DESC']],
        });
        return NextResponse.json(facturas);
    } catch (error) {
        console.error('Error fetching facturas de proveedor:', error);
        return NextResponse.json({ message: 'Error al obtener facturas de proveedor', error: error.message }, { status: 500 });
    }
}