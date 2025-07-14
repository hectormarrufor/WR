import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const consumibleId = searchParams.get('consumibleId');
    const tipoEntrada = searchParams.get('tipoEntrada');

    const whereClause = {};
    if (consumibleId) whereClause.consumibleId = consumibleId;
    if (tipoEntrada) whereClause.tipoEntrada = tipoEntrada;

    const entradas = await db.EntradaInventario.findAll({
      where: whereClause,
      include: [
        { model: db.Consumible, as: 'consumible' },
        { model: db.OrdenCompra, as: 'ordenCompra' },
        { model: db.Empleado, as: 'recibidoPor' },
      ],
      order: [['fechaEntrada', 'DESC']],
    });
    return NextResponse.json(entradas);
  } catch (error) {
    console.error('Error fetching entradas de inventario:', error);
    return NextResponse.json({ message: 'Error al obtener entradas de inventario', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const transaction = await db.sequelize.transaction(); // Iniciar transacción
  try {
    const body = await request.json();
    const { consumibleId, cantidad, ...rest } = body;

    const consumible = await db.Consumible.findByPk(consumibleId, { transaction });
    if (!consumible) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Consumible no encontrado' }, { status: 404 });
    }

    // Registrar la entrada de inventario
    const nuevaEntrada = await db.EntradaInventario.create({
      consumibleId,
      cantidad,
      ...rest,
    }, { transaction });

    // Actualizar la cantidad disponible del consumible
    await consumible.update({
      cantidadDisponible: consumible.cantidadDisponible + parseFloat(cantidad),
      fechaUltimaEntrada: new Date()
    }, { transaction });

    await transaction.commit(); // Confirmar la transacción
    return NextResponse.json(nuevaEntrada, { status: 201 });
  } catch (error) {
    await transaction.rollback(); // Revertir en caso de error
    console.error('Error creating entrada de inventario:', error);
    return NextResponse.json({ message: 'Error al crear entrada de inventario', error: error.message }, { status: 400 });
  }
}