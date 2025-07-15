import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const proveedorId = searchParams.get('proveedorId');
    const includeDetails = searchParams.get('includeDetails') === 'true';

    const whereClause = proveedorId ? { proveedorId } : {};
    const includeOptions = [{ model: db.Proveedor, as: 'proveedor' }];

    if (includeDetails) {
      includeOptions.push({
        model: db.DetalleOrdenCompra,
        as: 'detalles',
        include: [{ model: db.Consumible, as: 'consumible' }]
      });
    }

    const ordenesCompra = await db.OrdenCompra.findAll({
      where: whereClause,
      include: includeOptions,
      order: [['fechaOrden', 'DESC']],
    });
    return NextResponse.json(ordenesCompra);
  } catch (error) {
    console.error('Error fetching ordenes de compra:', error);
    return NextResponse.json({ message: 'Error al obtener órdenes de compra', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { detalles, ...ordenCompraData } = body;

    // Usar una transacción para asegurar la consistencia si se crean detalles al mismo tiempo
    const result = await db.sequelize.transaction(async (t) => {
      const nuevaOrden = await db.OrdenCompra.create(ordenCompraData, { transaction: t });

      if (detalles && detalles.length > 0) {
        const detallesConOrdenId = detalles.map(d => ({ ...d, ordenCompraId: nuevaOrden.id }));
        await db.DetalleOrdenCompra.bulkCreate(detallesConOrdenId, { transaction: t });
      }
      return nuevaOrden;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating orden de compra:', error);
    return NextResponse.json({ message: 'Error al crear orden de compra', error: error.message }, { status: 400 });
  }
}