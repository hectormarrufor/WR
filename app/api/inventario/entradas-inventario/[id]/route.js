// app/api/superuser/inventario/entradas/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const entrada = await db.EntradaInventario.findByPk(id, {
      include: [
        { model: db.Consumible, as: 'consumible' },
        { model: db.OrdenCompra, as: 'ordenCompra', include: [{ model: db.Proveedor, as: 'proveedor' }] },
        { model: db.Empleado, as: 'recibidoPor' }
      ],
    });

    if (!entrada) {
      return NextResponse.json({ message: 'Entrada de inventario no encontrada' }, { status: 404 });
    }
    return NextResponse.json(entrada);
  } catch (error) {
    console.error('Error fetching entrada de inventario:', error);
    return NextResponse.json({ message: 'Error al obtener entrada de inventario', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const entrada = await db.EntradaInventario.findByPk(id, { transaction });

    if (!entrada) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Entrada de inventario no encontrada' }, { status: 404 });
    }

    // **IMPORTANTE:** Solo permitir la actualización de campos no relacionados con la cantidad o el consumible
    // para evitar inconsistencias en el stock.
    const { consumibleId, cantidad, ...updateData } = body; // Excluir estos campos de la actualización directa
    await entrada.update(updateData, { transaction });

    await transaction.commit();
    return NextResponse.json(entrada);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating entrada de inventario:', error);
    return NextResponse.json({ message: 'Error al actualizar entrada de inventario', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction();
  try {
    const entrada = await db.EntradaInventario.findByPk(id, { transaction });

    if (!entrada) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Entrada de inventario no encontrada' }, { status: 404 });
    }

    const consumible = await db.Consumible.findByPk(entrada.consumibleId, { transaction });
    if (!consumible) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Consumible asociado no encontrado. No se puede revertir el stock.' }, { status: 404 });
    }

    // **LÓGICA CRÍTICA:** Revertir el stock del consumible
    const cantidadARevertir = parseFloat(entrada.cantidad);
    const nuevoStock = parseFloat(consumible.stockActual) - cantidadARevertir;

    if (nuevoStock < 0) {
      // Opcional: Si el stock se vuelve negativo, puedes decidir si permites esto o lo rechazas
      // Si el negocio requiere stock negativo, puedes eliminar esta validación.
      // Si el stock debe ser siempre positivo, esto evita inconsistencias.
      await transaction.rollback();
      return NextResponse.json({ message: `No se puede eliminar la entrada. El stock del consumible (${consumible.nombre}) se volvería negativo (${nuevoStock.toFixed(2)}). Realice un ajuste manual si es necesario.` }, { status: 400 });
    }

    await consumible.update({ stockActual: nuevoStock.toFixed(2) }, { transaction });

    // Eliminar la entrada de inventario
    await entrada.destroy({ transaction });

    await transaction.commit();
    return NextResponse.json({ message: 'Entrada de inventario eliminada y stock revertido exitosamente.' }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting entrada de inventario:', error);
    return NextResponse.json({ message: 'Error al eliminar entrada de inventario', error: error.message }, { status: 500 });
  }
}