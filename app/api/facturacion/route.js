// app/api/superuser/facturacion/route.js
import { NextResponse } from 'next/server';
import db from '../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');
    const estado = searchParams.get('estado');

    const whereClause = {};
    if (clienteId) whereClause.clienteId = clienteId;
    if (estado) whereClause.estado = estado;

    const facturas = await db.Factura.findAll({
      where: whereClause,
      include: [
        { model: db.Cliente },
        { model: db.ContratoServicio },
        { model: db.OperacionCampo },
        { model: db.RenglonFactura, as: 'renglones' }, // Incluir renglones por defecto en el listado
      ],
      order: [['fechaEmision', 'DESC']],
    });
    return NextResponse.json(facturas);
  } catch (error) {
    console.error('Error fetching facturas:', error);
    return NextResponse.json({ message: 'Error al obtener facturas', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const transaction = await db.sequelize.transaction(); // Iniciar una transacción
  try {
    const body = await request.json();
    const { renglones, ...facturaData } = body;

    // Calcular montoTotal, impuestos, totalAPagar si no vienen calculados
    let montoTotal = 0;
    if (renglones && renglones.length > 0) {
      montoTotal = renglones.reduce((sum, item) => sum + (parseFloat(item.cantidad) * parseFloat(item.precioUnitario)), 0);
    }
    // Aquí puedes aplicar tu lógica de impuestos (ej. 16% de IVA)
    const impuestos = montoTotal * 0.16; // Ejemplo: 16% de IVA
    const totalAPagar = montoTotal + impuestos;

    const nuevaFactura = await db.Factura.create({
      ...facturaData,
      montoTotal: montoTotal.toFixed(2),
      impuestos: impuestos.toFixed(2),
      totalAPagar: totalAPagar.toFixed(2),
    }, { transaction });

    if (renglones && renglones.length > 0) {
      const renglonesConFacturaId = renglones.map(r => ({
        ...r,
        facturaId: nuevaFactura.id,
        subtotal: (parseFloat(r.cantidad) * parseFloat(r.precioUnitario)).toFixed(2), // Calcular subtotal por renglón
      }));
      await db.RenglonFactura.bulkCreate(renglonesConFacturaId, { transaction });
    }

    await transaction.commit(); // Confirmar la transacción
    return NextResponse.json(nuevaFactura, { status: 201 });
  } catch (error) {
    await transaction.rollback(); // Revertir la transacción en caso de error
    console.error('Error creating factura:', error);
    return NextResponse.json({ message: 'Error al crear factura', error: error.message }, { status: 400 });
  }
}