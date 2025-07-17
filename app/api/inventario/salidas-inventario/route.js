// app/api/superuser/inventario/salidas/route.js
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import db from '../../../../models';


export async function POST(request) {
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { consumibleId, cantidad, fechaSalida, motivo, entregadoPorId, contratoServicioId, notas } = body;

    // 1. Verificar el stock disponible antes de la salida
    const consumible = await db.Consumible.findByPk(consumibleId, { transaction });
    if (!consumible) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Consumible no encontrado.' }, { status: 404 });
    }

    const cantidadRequerida = parseFloat(cantidad);
    if (parseFloat(consumible.stockActual) < cantidadRequerida) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Stock insuficiente para esta salida.' }, { status: 400 });
    }

    // 2. Crear el registro de salida
    const nuevaSalida = await db.SalidaInventario.create({
      consumibleId: parseInt(consumibleId),
      cantidad: cantidadRequerida,
      fechaSalida: fechaSalida,
      motivo: motivo,
      entregadoPorId: entregadoPorId ? parseInt(entregadoPorId) : null,
      contratoServicioId: contratoServicioId ? parseInt(contratoServicioId) : null,
      notas: notas,
    }, { transaction });

    // 3. Actualizar el stock actual del consumible
    const nuevoStock = parseFloat(consumible.stockActual) - cantidadRequerida;
    await consumible.update({ stockActual: nuevoStock.toFixed(2) }, { transaction });

    await transaction.commit();
    return NextResponse.json(nuevaSalida, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creando salida de inventario:', error);
    return NextResponse.json({ message: 'Error al crear salida de inventario', error: error.message }, { status: 400 });
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

        const salidas = await db.SalidaInventario.findAll({
            where: whereClause,
            include: [
                { model: db.Consumible, as: 'consumible' },
                { model: db.Empleado, as: 'entregadoPor' },
                { model: db.ContratoServicio, as: 'contratoServicio' }
            ],
            order: [['fechaSalida', 'DESC']],
        });
        return NextResponse.json(salidas);
    } catch (error) {
        console.error('Error fetching salidas de inventario:', error);
        return NextResponse.json({ message: 'Error al obtener salidas de inventario', error: error.message }, { status: 500 });
    }
}