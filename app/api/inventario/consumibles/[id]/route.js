// app/api/superuser/inventario/consumibles/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = params;
  try {
    const consumible = await db.Consumible.findByPk(id, {
      // Opcional: Incluir directamente entradas y salidas si lo prefieres en una sola llamada
      // Esto hará la respuesta de esta API más grande, pero evita llamadas adicionales en el frontend.
      // Si ya estás haciendo llamadas separadas en el frontend (como lo hicimos), no es estrictamente necesario aquí.
      include: [
        { model: db.EntradaInventario, as: 'entradas', include: [{ model: db.OrdenCompra, as: 'ordenCompra' }, { model: db.Empleado, as: 'recibidoPor' }] },
        { model: db.SalidaInventario, as: 'salidas', include: [{ model: db.ContratoServicio, as: 'contratoServicio' }, { model: db.Empleado, as: 'entregadoPor' }] },
      ],
    });
    if (!consumible) {
      return NextResponse.json({ message: 'Consumible no encontrado' }, { status: 404 });
    }
    return NextResponse.json(consumible);
  } catch (error) {
    console.error('Error fetching consumible:', error);
    return NextResponse.json({ message: 'Error al obtener consumible', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const body = await request.json();
    const consumible = await db.Consumible.findByPk(id);

    if (!consumible) {
      return NextResponse.json({ message: 'Consumible no encontrado' }, { status: 404 });
    }

    // **IMPORTANTE:** No permitir actualizar `stockActual` directamente desde PUT.
    // El stock debe ser modificado SÓLO a través de las APIs de EntradaInventario y SalidaInventario
    // para mantener la integridad del historial de movimientos.
    const { stockActual, ...updateData } = body; // Excluye stockActual del body de actualización
    await consumible.update(updateData);
    return NextResponse.json(consumible);
  } catch (error) {
    console.error('Error updating consumible:', error);
    return NextResponse.json({ message: 'Error al actualizar consumible', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction();
  try {
    const consumible = await db.Consumible.findByPk(id, { transaction });

    if (!consumible) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Consumible no encontrado' }, { status: 404 });
    }

    // Opcional: Verificar si hay movimientos asociados antes de eliminar
    // Esto podría evitar que se elimine un consumible con historial
    const entradasCount = await db.EntradaInventario.count({ where: { consumibleId: id }, transaction });
    const salidasCount = await db.SalidaInventario.count({ where: { consumibleId: id }, transaction });
    const usadosCount = await db.ConsumibleUsado.count({ where: { consumibleId: id }, transaction });

    if (entradasCount > 0 || salidasCount > 0 || usadosCount > 0) {
      await transaction.rollback();
      return NextResponse.json({ message: 'No se puede eliminar el consumible porque tiene movimientos de inventario o usos asociados. Considere desactivarlo.' }, { status: 400 });
    }

    await consumible.destroy({ transaction });
    await transaction.commit();
    return NextResponse.json({ message: 'Consumible eliminado exitosamente' }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting consumible:', error);
    return NextResponse.json({ message: 'Error al eliminar consumible', error: error.message }, { status: 500 });
  }
}