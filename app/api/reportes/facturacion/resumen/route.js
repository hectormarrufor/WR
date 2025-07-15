// app/api/superuser/reportes/facturacion/resumen/route.js
import { NextResponse } from 'next/server';
import { Op } from 'sequelize'; // Importa Op para operaciones de Sequelize
import db from '../../../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateFilter = {};
    if (startDate) {
      dateFilter[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      // Asegurar que endDate incluya todo el día
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter[Op.lte] = end;
    }

    // Resumen de Facturas por Estado
    const facturasPorEstado = await db.Factura.findAll({
      attributes: [
        'estado',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'cantidad'],
        [db.sequelize.fn('SUM', db.sequelize.col('totalAPagar')), 'totalMonto'],
      ],
      where: {
        fechaEmision: {
          ...dateFilter
        }
      },
      group: ['estado'],
      raw: true,
    });

    // Total de Pagos Recibidos
    const totalPagos = await db.PagoFactura.findAll({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('monto')), 'totalPagado'],
      ],
      where: {
        fechaPago: {
          ...dateFilter
        }
      },
      raw: true,
    });
    const totalPagado = parseFloat(totalPagos[0]?.totalPagado || 0);

    // Saldo Pendiente General
    const totalFacturadoGlobal = await db.Factura.findAll({
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.col('totalAPagar')), 'totalGeneralFacturado'],
      ],
      where: {
        fechaEmision: {
          ...dateFilter
        }
      },
      raw: true,
    });
    const totalFacturado = parseFloat(totalFacturadoGlobal[0]?.totalGeneralFacturado || 0);

    // Suma de Notas de Crédito emitidas (para un período dado)
    const totalNotasCredito = await db.NotaCredito.findAll({
        attributes: [
            [db.sequelize.fn('SUM', db.sequelize.col('monto')), 'totalNotasCredito'],
        ],
        where: {
            fechaEmision: {
                ...dateFilter
            }
        },
        raw: true,
    });
    const totalNotasCreditoMonto = parseFloat(totalNotasCredito[0]?.totalNotasCredito || 0);


    return NextResponse.json({
      facturasPorEstado,
      totalFacturado: totalFacturado.toFixed(2),
      totalPagado: totalPagado.toFixed(2),
      totalNotasCredito: totalNotasCreditoMonto.toFixed(2),
      saldoNeto: (totalFacturado - totalPagado - totalNotasCreditoMonto).toFixed(2), // Simplificado
    });
  } catch (error) {
    console.error('Error generating billing summary report:', error);
    return NextResponse.json({ message: 'Error al generar el reporte de facturación', error: error.message }, { status: 500 });
  }
}