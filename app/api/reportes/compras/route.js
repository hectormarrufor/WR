// app/api/superuser/reportes/compras/route.js
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import db from '../../../../models';


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const proveedorId = searchParams.get('proveedorId');
    const consumibleId = searchParams.get('consumibleId');
    const estadoOC = searchParams.get('estadoOC'); // Estado de la Orden de Compra

    const whereOrdenCompra = {};
    const whereDetalleOrdenCompra = {};
    const whereRecepcionCompra = {};
    const whereDetalleRecepcionCompra = {};
    const whereFacturaProveedor = {}; // Para el futuro, si queremos incluir facturas
    const wherePagoProveedor = {}; // Para el futuro, si queremos incluir pagos

    // Filtrar por rango de fechas (usaremos fecha de emisión de OC por ahora)
    if (fechaInicio) {
      whereOrdenCompra.fechaEmision = { [Op.gte]: fechaInicio };
    }
    if (fechaFin) {
      whereOrdenCompra.fechaEmision = {
        ...(whereOrdenCompra.fechaEmision || {}), // Mantener si ya tiene fechaInicio
        [Op.lte]: fechaFin
      };
    }

    if (proveedorId) {
      whereOrdenCompra.proveedorId = parseInt(proveedorId);
    }

    if (consumibleId) {
      // Filtrar detalles de OC y Recepción por consumible
      whereDetalleOrdenCompra.consumibleId = parseInt(consumibleId);
      whereDetalleRecepcionCompra.consumibleId = parseInt(consumibleId);
    }

    if (estadoOC) {
      whereOrdenCompra.estado = estadoOC;
    }

    // --- Consulta Principal: Órdenes de Compra con Recepciones y Detalles ---
    const ordenesCompraReporte = await db.OrdenCompra.findAll({
      where: whereOrdenCompra,
      include: [
        {
          model: db.Proveedor,
          as: 'proveedor',
          attributes: ['id', 'nombre'],
        },
        {
          model: db.DetalleOrdenCompra,
          as: 'detalles',
          where: whereDetalleOrdenCompra, // Aplicar filtro de consumible aquí
          include: [
            {
              model: db.Consumible,
              as: 'consumible',
              attributes: ['id', 'nombre', 'unidadMedida'],
            },
          ],
        },
        {
          model: db.RecepcionCompra,
          as: 'recepciones',
          where: whereRecepcionCompra,
          include: [
            {
              model: db.DetalleRecepcionCompra,
              as: 'detalles',
              where: whereDetalleRecepcionCompra, // Aplicar filtro de consumible aquí
              include: [
                {
                  model: db.Consumible,
                  as: 'consumible', // Para asegurar que el consumible se carga para este detalle
                  attributes: ['id', 'nombre', 'unidadMedida'],
                },
              ],
            },
          ],
        },
        // Opcional: Incluir FacturasProveedor y PagosProveedor para un reporte más completo
        {
            model: db.FacturaProveedor,
            as: 'facturasProveedor',
            where: whereFacturaProveedor,
            include: [{
                model: db.PagoProveedor,
                as: 'pagos',
                where: wherePagoProveedor,
                attributes: ['id', 'monto', 'fechaPago', 'metodoPago']
            }]
        }
      ],
      order: [
        ['fechaEmision', 'DESC'],
        ['createdAt', 'DESC'],
        [db.DetalleOrdenCompra, 'id', 'ASC'],
        [db.RecepcionCompra, 'id', 'ASC'],
      ],
    });

    // Procesar los datos para el reporte
    const reporteResumen = {
        totalOrdenado: 0,
        totalRecibido: 0,
        totalFacturado: 0,
        totalPagado: 0,
        comprasPorProveedor: {},
        comprasPorConsumible: {},
        ordenes: [], // Lista detallada de órdenes
    };

    ordenesCompraReporte.forEach(oc => {
        const ocData = oc.toJSON();
        let ocTotalRecibido = 0;
        let ocTotalFacturado = 0;
        let ocTotalPagado = 0;

        reporteResumen.totalOrdenado += parseFloat(ocData.montoTotal || 0);

        // Agrupar por proveedor
        if (!reporteResumen.comprasPorProveedor[ocData.proveedor.nombre]) {
            reporteResumen.comprasPorProveedor[ocData.proveedor.nombre] = {
                totalOrdenado: 0,
                totalRecibido: 0,
                totalFacturado: 0,
                totalPagado: 0,
                ordenes: []
            };
        }
        reporteResumen.comprasPorProveedor[ocData.proveedor.nombre].totalOrdenado += parseFloat(ocData.montoTotal || 0);
        reporteResumen.comprasPorProveedor[ocData.proveedor.nombre].ordenes.push({
            numeroOrden: ocData.numeroOrden,
            fechaEmision: ocData.fechaEmision,
            montoTotal: parseFloat(ocData.montoTotal),
            estado: ocData.estado,
        });


        // Procesar recepciones
        ocData.recepciones.forEach(recepcion => {
            recepcion.detalles.forEach(detalleRecepcion => {
                const costoItemRecibido = parseFloat(detalleRecepcion.cantidadRecibida) * parseFloat(detalleRecepcion.precioUnitario);
                ocTotalRecibido += costoItemRecibido;
                reporteResumen.totalRecibido += costoItemRecibido;

                if (!reporteResumen.comprasPorConsumible[detalleRecepcion.consumible.nombre]) {
                    reporteResumen.comprasPorConsumible[detalleRecepcion.consumible.nombre] = {
                        cantidadRecibida: 0,
                        costoTotal: 0,
                    };
                }
                reporteResumen.comprasPorConsumible[detalleRecepcion.consumible.nombre].cantidadRecibida += parseFloat(detalleRecepcion.cantidadRecibida);
                reporteResumen.comprasPorConsumible[detalleRecepcion.consumible.nombre].costoTotal += costoItemRecibido;
            });
        });

        // Procesar facturas de proveedor
        ocData.facturasProveedor.forEach(factura => {
            ocTotalFacturado += parseFloat(factura.montoTotal);
            reporteResumen.totalFacturado += parseFloat(factura.montoTotal);

            factura.pagos.forEach(pago => {
                ocTotalPagado += parseFloat(pago.monto);
                reporteResumen.totalPagado += parseFloat(pago.monto);
            });
        });

        reporteResumen.comprasPorProveedor[ocData.proveedor.nombre].totalRecibido += ocTotalRecibido;
        reporteResumen.comprasPorProveedor[ocData.proveedor.nombre].totalFacturado += ocTotalFacturado;
        reporteResumen.comprasPorProveedor[ocData.proveedor.nombre].totalPagado += ocTotalPagado;

        reporteResumen.ordenes.push({
            id: ocData.id,
            numeroOrden: ocData.numeroOrden,
            fechaEmision: ocData.fechaEmision,
            proveedor: ocData.proveedor.nombre,
            montoTotalOrden: parseFloat(ocData.montoTotal),
            estadoOrden: ocData.estado,
            totalRecibidoOC: ocTotalRecibido,
            totalFacturadoOC: ocTotalFacturado,
            totalPagadoOC: ocTotalPagado,
            detallesOrden: ocData.detalles.map(d => ({
                consumible: d.consumible.nombre,
                cantidadOrdenada: parseFloat(d.cantidad),
                precioUnitarioOrden: parseFloat(d.precioUnitario),
                cantidadRecibida: ocData.recepciones.reduce((sum, r) =>
                    sum + r.detalles.filter(dr => dr.consumibleId === d.consumibleId)
                                     .reduce((s, dr) => s + parseFloat(dr.cantidadRecibida), 0), 0
                ),
                cantidadFacturada: parseFloat(d.cantidadFacturada),
            })),
            recepciones: ocData.recepciones.map(r => ({
                id: r.id,
                numeroRecepcion: r.numeroRecepcion,
                fechaRecepcion: r.fechaRecepcion,
                detalles: r.detalles.map(dr => ({
                    consumible: dr.consumible.nombre,
                    cantidadRecibida: parseFloat(dr.cantidadRecibida),
                    precioUnitario: parseFloat(dr.precioUnitario),
                }))
            })),
            facturas: ocData.facturasProveedor.map(f => ({
                id: f.id,
                numeroFactura: f.numeroFactura,
                fechaEmision: f.fechaEmision,
                montoTotal: parseFloat(f.montoTotal),
                montoPagado: parseFloat(f.montoPagado),
                estado: f.estado,
                pagos: f.pagos.map(p => ({
                    monto: parseFloat(p.monto),
                    fechaPago: p.fechaPago,
                    metodoPago: p.metodoPago,
                }))
            }))
        });
    });

    return NextResponse.json(reporteResumen);

  } catch (error) {
    console.error('Error generando reporte de compras:', error);
    return NextResponse.json({ message: 'Error al generar reporte de compras', error: error.message }, { status: 500 });
  }
}