// app/api/superuser/inventario/entradas/route.js
import { NextResponse } from 'next/server';
import { Op } from 'sequelize'; // Importa Op para usar operadores de Sequelize
import db from '../../../../models';


export async function POST(request) {
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { consumibleId, cantidad, fechaEntrada, ordenCompraId, recibidoPorId, notas } = body;

    // 1. Crear el registro de entrada
    const nuevaEntrada = await db.EntradaInventario.create({
      consumibleId: parseInt(consumibleId),
      cantidad: parseFloat(cantidad),
      fechaEntrada: fechaEntrada, // Asegúrate de que esto es un formato válido para tu DB
      ordenCompraId: ordenCompraId ? parseInt(ordenCompraId) : null,
      recibidoPorId: recibidoPorId ? parseInt(recibidoPorId) : null,
      notas: notas,
    }, { transaction });

    // 2. Actualizar el stock actual del consumible
    const consumible = await db.Consumible.findByPk(consumibleId, { transaction });
    if (!consumible) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Consumible no encontrado.' }, { status: 404 });
    }

    const nuevoStock = parseFloat(consumible.stockActual) + parseFloat(cantidad);
    await consumible.update({ stockActual: nuevoStock.toFixed(2) }, { transaction });

    await transaction.commit();
    return NextResponse.json(nuevaEntrada, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creando entrada de inventario:', error);
    return NextResponse.json({ message: 'Error al crear entrada de inventario', error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const consumibleId = searchParams.get('consumibleId');

        const whereClause = {};
        if (consumibleId) {
          whereClause.consumibleId = consumibleId;
        }

        const entradas = await db.EntradaInventario.findAll({
            where: whereClause,
            include: [
                { model: db.Consumible, as: 'consumible' },
                { model: db.OrdenCompra, as: 'ordenCompra', include: [{ model: db.Proveedor, as: 'proveedor' }] }, // Incluye proveedor si lo necesitas
                { model: db.Empleado, as: 'recibidoPor' }
            ],
            order: [['fechaEntrada', 'DESC']],
        });
        return NextResponse.json(entradas);
    } catch (error) {
        console.error('Error fetching entradas de inventario:', error);
        return NextResponse.json({ message: 'Error al obtener entradas de inventario', error: error.message }, { status: 500 });
    }
}