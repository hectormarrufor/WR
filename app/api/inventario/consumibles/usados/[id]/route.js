// app/api/superuser/inventario/consumibles-usados/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../../models';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const consumibleUsado = await db.ConsumibleUsado.findByPk(id, {
      include: [
        { model: db.Consumible, as: 'consumible' },
        { model: db.ContratoServicio, as: 'contratoServicio', include: [{ model: db.Cliente, as: 'cliente' }] },
        { model: db.Equipo, as: 'equipo' },
        { model: db.Empleado, as: 'empleado' }
      ],
    });

    if (!consumibleUsado) {
      return NextResponse.json({ message: 'Consumible usado no encontrado' }, { status: 404 });
    }
    return NextResponse.json(consumibleUsado);
  } catch (error) {
    console.error('Error fetching consumible usado:', error);
    return NextResponse.json({ message: 'Error al obtener consumible usado', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const consumibleUsado = await db.ConsumibleUsado.findByPk(id, { transaction });

    if (!consumibleUsado) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Consumible usado no encontrado' }, { status: 404 });
    }

    // **IMPORTANTE:** Al igual que con Entradas/Salidas, desaconsejo cambiar cantidad/consumible directo aquí
    // para mantener la integridad del stock y el historial. Para correcciones, idealmente usar ajustes.
    const { consumibleId, cantidadUsada, ...updateData } = body; // Excluir estos campos
    await consumibleUsado.update(updateData, { transaction });

    await transaction.commit();
    return NextResponse.json(consumibleUsado);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating consumible usado:', error);
    return NextResponse.json({ message: 'Error al actualizar consumible usado', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction();
  try {
    const consumibleUsado = await db.ConsumibleUsado.findByPk(id, { transaction });

    if (!consumibleUsado) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Consumible usado no encontrado' }, { status: 404 });
    }

    const consumible = await db.Consumible.findByPk(consumibleUsado.consumibleId, { transaction });
    if (!consumible) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Consumible asociado no encontrado. No se puede revertir el stock.' }, { status: 404 });
    }

    // **LÓGICA CRÍTICA:** Revertir el stock del consumible
    // Al eliminar un "uso", la cantidad debe ser AÑADIDA de nuevo al stock.
    const cantidadARevertir = parseFloat(consumibleUsado.cantidadUsada);
    const nuevoStock = parseFloat(consumible.stockActual) + cantidadARevertir;

    await consumible.update({ stockActual: nuevoStock.toFixed(2) }, { transaction });

    // Eliminar el registro de consumible usado
    await consumibleUsado.destroy({ transaction });

    await transaction.commit();
    return NextResponse.json({ message: 'Registro de consumible usado eliminado y stock revertido exitosamente.' }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting consumible usado:', error);
    return NextResponse.json({ message: 'Error al eliminar consumible usado', error: error.message }, { status: 500 });
  }
}