import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const consumibleId = searchParams.get('consumibleId');
    const tipoSalida = searchParams.get('tipoSalida');

    const whereClause = {};
    if (consumibleId) whereClause.consumibleId = consumibleId;
    if (tipoSalida) whereClause.tipoSalida = tipoSalida;

    const salidas = await db.SalidaInventario.findAll({
      where: whereClause,
      include: [
        { model: db.Consumible, as: 'consumible' },
        { model: db.Empleado, as: 'entregadoPor' },
        { model: db.ContratoServicio, as: 'contratoServicio' },
      ],
      order: [['fechaSalida', 'DESC']],
    });
    return NextResponse.json(salidas);
  } catch (error) {
    console.error('Error fetching salidas de inventario:', error);
    return NextResponse.json({ message: 'Error al obtener salidas de inventario', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { consumibleId, cantidad, ...rest } = body;

    const consumible = await db.Consumible.findByPk(consumibleId, { transaction });
    if (!consumible) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Consumible no encontrado' }, { status: 404 });
    }

    // Validar que haya suficiente stock
    if (consumible.cantidadDisponible < parseFloat(cantidad)) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Cantidad insuficiente en inventario' }, { status: 400 });
    }

    // Registrar la salida de inventario
    const nuevaSalida = await db.SalidaInventario.create({
      consumibleId,
      cantidad,
      ...rest,
    }, { transaction });

    // Actualizar la cantidad disponible del consumible
    await consumible.update({
      cantidadDisponible: consumible.cantidadDisponible - parseFloat(cantidad)
    }, { transaction });

    await transaction.commit();
    return NextResponse.json(nuevaSalida, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating salida de inventario:', error);
    return NextResponse.json({ message: 'Error al crear salida de inventario', error: error.message }, { status: 400 });
  }
}