// app/api/superuser/inventario/salidas/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const salida = await db.SalidaInventario.findByPk(id, {
      include: [
        { model: db.Consumible, as: 'consumible' },
        { model: db.Empleado, as: 'entregadoPor' },
        { model: db.ContratoServicio, as: 'contratoServicio' } // Asumiendo que tienes este modelo
      ],
    });

    if (!salida) {
      return NextResponse.json({ message: 'Salida de inventario no encontrada' }, { status: 404 });
    }
    return NextResponse.json(salida);
  } catch (error) {
    console.error('Error fetching salida de inventario:', error);
    return NextResponse.json({ message: 'Error al obtener salida de inventario', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const salida = await db.SalidaInventario.findByPk(id, { transaction });

    if (!salida) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Salida de inventario no encontrada' }, { status: 404 });
    }

    // **IMPORTANTE:** Solo permitir la actualización de campos no relacionados con la cantidad o el consumible
    // para evitar inconsistencias en el stock. La cantidad y el consumible de una salida no deben cambiarse.
    const { consumibleId, cantidad, ...updateData } = body; // Excluir estos campos de la actualización directa
    await salida.update(updateData, { transaction });

    await transaction.commit();
    return NextResponse.json(salida);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating salida de inventario:', error);
    return NextResponse.json({ message: 'Error al actualizar salida de inventario', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction();
  try {
    const salida = await db.SalidaInventario.findByPk(id, { transaction });

    if (!salida) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Salida de inventario no encontrada' }, { status: 404 });
    }

    const consumible = await db.Consumible.findByPk(salida.consumibleId, { transaction });
    if (!consumible) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Consumible asociado no encontrado. No se puede revertir el stock.' }, { status: 404 });
    }

    // **LÓGICA CRÍTICA:** Revertir el stock del consumible
    // Al eliminar una SALIDA, la cantidad debe ser AÑADIDA de nuevo al stock.
    const cantidadARevertir = parseFloat(salida.cantidad);
    const nuevoStock = parseFloat(consumible.stockActual) + cantidadARevertir;

    await consumible.update({ stockActual: nuevoStock.toFixed(2) }, { transaction });

    // Eliminar la salida de inventario
    await salida.destroy({ transaction });

    await transaction.commit();
    return NextResponse.json({ message: 'Salida de inventario eliminada y stock revertido exitosamente.' }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting salida de inventario:', error);
    return NextResponse.json({ message: 'Error al eliminar salida de inventario', error: error.message }, { status: 500 });
  }
}