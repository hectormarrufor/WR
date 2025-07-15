// app/api/superuser/compras/recepciones-compra/[id]/route.js
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import db from '../../../../../models';


export async function GET(request, { params }) {
  const { id } = params;
  try {
    const recepcionCompra = await db.RecepcionCompra.findByPk(id, {
      include: [
        { model: db.OrdenCompra, as: 'ordenCompra', include: [db.Proveedor, { model: db.DetalleOrdenCompra, as: 'detalles', include: [db.Consumible] }] },
        { model: db.Empleado, as: 'recibidaPor' },
        { model: db.DetalleRecepcionCompra, as: 'detalles', include: [db.Consumible] },
      ],
    });

    if (!recepcionCompra) {
      return NextResponse.json({ message: 'Recepción de Compra no encontrada' }, { status: 404 });
    }
    return NextResponse.json(recepcionCompra);
  } catch (error) {
    console.error('Error fetching recepción de compra:', error);
    return NextResponse.json({ message: 'Error al obtener recepción de compra', error: error.message }, { status: 500 });
  }
}

// NO HAY PUT para Recepción de Compra por complejidad de reversión de inventario
// export async function PUT(request, { params }) { ... }

export async function DELETE(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction();
  try {
    const recepcionCompra = await db.RecepcionCompra.findByPk(id, {
      include: [
        { model: db.DetalleRecepcionCompra, as: 'detalles' },
        { model: db.OrdenCompra, as: 'ordenCompra', include: [{ model: db.DetalleOrdenCompra, as: 'detalles' }] },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!recepcionCompra) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Recepción de Compra no encontrada' }, { status: 404 });
    }

    const ordenCompra = recepcionCompra.ordenCompra;
    if (!ordenCompra) { // Esto no debería pasar si se creó correctamente
        await transaction.rollback();
        return NextResponse.json({ message: 'Orden de Compra asociada no encontrada.' }, { status: 500 });
    }


    // 1. Revertir las Entradas de Inventario y el stock de Consumibles
    for (const detalleRecepcion of recepcionCompra.detalles) {
      const consumibleId = detalleRecepcion.consumibleId;
      const cantidadRecibida = parseFloat(detalleRecepcion.cantidadRecibida);

      // Eliminar EntradaInventario (si existe y fue generada por este detalle de recepción)
      await db.EntradaInventario.destroy({
        where: { detalleRecepcionCompraId: detalleRecepcion.id },
        transaction,
      });

      // Revertir stock del Consumible
      const consumible = await db.Consumible.findByPk(consumibleId, { transaction, lock: transaction.LOCK.UPDATE });
      if (consumible) {
        const currentStock = parseFloat(consumible.stockActual);
        // Cuidado con el precio promedio al revertir. Aquí una simplificación.
        // Un sistema robusto recalcularía el promedio de los restantes o usaría FIFO/LIFO.
        // Por ahora, solo resta la cantidad.
        if (currentStock < cantidadRecibida) {
            throw new Error(`Stock insuficiente para revertir la recepción del consumible ${consumible.nombre}. Requerido: ${cantidadRecibida}, Actual: ${currentStock}.`);
        }
        consumible.stockActual = (currentStock - cantidadRecibida).toFixed(2);
        // Si el precio promedio se debe recalcular, se requeriría una lógica más compleja
        // que implicaría los precios de las entradas restantes.
        await consumible.save({ transaction });
      }

      // Revertir cantidadRecibida en DetalleOrdenCompra
      const ocDetalle = ordenCompra.detalles.find(d => d.consumibleId === consumibleId);
      if (ocDetalle) {
        ocDetalle.cantidadRecibida = (parseFloat(ocDetalle.cantidadRecibida) - cantidadRecibida).toFixed(2);
        ocDetalle.recibidoCompletamente = false; // Ya no está completo si se revierte algo
        await ocDetalle.save({ transaction });
      }
    }

    // 2. Actualizar la Orden de Compra: estado y totalRecibido
    ordenCompra.totalRecibido = (parseFloat(ordenCompra.totalRecibido) - recepcionCompra.detalles.reduce((sum, d) => sum + parseFloat(d.cantidadRecibida), 0)).toFixed(2);

    let todosDetallesOCPendientes = true; // Si todos los ítems de la OC no tienen nada recibido
    let ocParcialmenteRecibida = false;
    for (const d of ordenCompra.detalles) {
        if (parseFloat(d.cantidadRecibida) > 0) {
            todosDetallesOCPendientes = false;
            ocParcialmenteRecibida = true; // Al menos un item tiene algo recibido
            break;
        }
    }

    // Determinar el nuevo estado de la OC
    if (todosDetallesOCPendientes) {
        ordenCompra.estado = 'Enviada'; // O 'Aprobada', si es el estado anterior a 'Enviada'
        // Esto asume que antes de 'Recibida Parcial' estaba en 'Enviada' o 'Aprobada'.
        // Podrías necesitar un historial de estados o una lógica más robusta aquí.
    } else if (ocParcialmenteRecibida) {
        ordenCompra.estado = 'Recibida Parcial';
    } else {
        ordenCompra.estado = 'Pendiente'; // Si no queda nada recibido en la OC
    }

    await ordenCompra.save({ transaction });

    // 3. Eliminar la Recepción de Compra y sus detalles
    await recepcionCompra.destroy({ transaction });

    await transaction.commit();
    return NextResponse.json({ message: 'Recepción de Compra eliminada y stock revertido exitosamente.' }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting recepción de compra:', error);
    return NextResponse.json({ message: 'Error al eliminar recepción de compra', error: error.message }, { status: 500 });
  }
}