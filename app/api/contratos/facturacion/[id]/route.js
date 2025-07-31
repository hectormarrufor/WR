// app/api/superuser/facturacion/[id]/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models';

export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const factura = await db.Factura.findByPk(id, {
      include: [
        { model: db.Cliente, as: 'cliente' },
        { model: db.ContratoServicio, as: 'contrato' },
        { model: db.OperacionCampo, as: 'operacionCampo' },
        { model: db.RenglonFactura, as: 'renglones' },
        { model: db.PagoFactura, as: 'pagos' },
      ],
    });

    if (!factura) {
      return NextResponse.json({ message: 'Factura no encontrada' }, { status: 404 });
    }
    return NextResponse.json(factura);
  } catch (error) {
    console.error('Error fetching factura:', error);
    return NextResponse.json({ message: 'Error al obtener factura', error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const transaction = await db.sequelize.transaction(); // Iniciar transacción
  try {
    const body = await request.json();
    const { renglones, ...facturaData } = body;

    const factura = await db.Factura.findByPk(id, { transaction });

    if (!factura) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Factura no encontrada' }, { status: 404 });
    }

    // Actualizar datos principales de la factura
    // Recalcular montos si se modifican los renglones o si se necesita forzar el cálculo
    let montoTotal = 0;
    if (renglones && renglones.length > 0) {
      montoTotal = renglones.reduce((sum, item) => sum + (parseFloat(item.cantidad) * parseFloat(item.precioUnitario)), 0);
    }
    const impuestos = montoTotal * 0.16; // Ejemplo: 16% de IVA
    const totalAPagar = montoTotal + impuestos;

    await factura.update({
      ...facturaData,
      montoTotal: montoTotal.toFixed(2),
      impuestos: impuestos.toFixed(2),
      totalAPagar: totalAPagar.toFixed(2),
    }, { transaction });

    // Lógica para actualizar renglones:
    // 1. Eliminar renglones existentes que no estén en el nuevo array
    // 2. Actualizar renglones existentes
    // 3. Crear nuevos renglones
    if (renglones) {
      const existingRenglonIds = factura.renglones.map(r => r.id);
      const incomingRenglonIds = renglones.filter(r => r.id).map(r => r.id);

      // Eliminar los que ya no están
      const renglonesToDelete = existingRenglonIds.filter(id => !incomingRenglonIds.includes(id));
      if (renglonesToDelete.length > 0) {
        await db.RenglonFactura.destroy({
          where: { id: renglonesToDelete, facturaId: factura.id },
          transaction
        });
      }

      // Crear o actualizar renglones
      for (const r of renglones) {
        if (r.id) { // Si tiene ID, es una actualización
          await db.RenglonFactura.update({
            descripcion: r.descripcion,
            cantidad: parseFloat(r.cantidad).toFixed(2),
            unidadMedida: r.unidadMedida,
            precioUnitario: parseFloat(r.precioUnitario).toFixed(2),
            subtotal: (parseFloat(r.cantidad) * parseFloat(r.precioUnitario)).toFixed(2),
          }, {
            where: { id: r.id, facturaId: factura.id },
            transaction
          });
        } else { // Si no tiene ID, es nuevo
          await db.RenglonFactura.create({
            facturaId: factura.id,
            descripcion: r.descripcion,
            cantidad: parseFloat(r.cantidad).toFixed(2),
            unidadMedida: r.unidadMedida,
            precioUnitario: parseFloat(r.precioUnitario).toFixed(2),
            subtotal: (parseFloat(r.cantidad) * parseFloat(r.precioUnitario)).toFixed(2),
          }, { transaction });
        }
      }
    }

    await transaction.commit();
    return NextResponse.json(factura);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating factura:', error);
    return NextResponse.json({ message: 'Error al actualizar factura', error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const transaction = await db.sequelize.transaction(); // Iniciar transacción
  try {
    const factura = await db.Factura.findByPk(id, {
      include: [{ model: db.PagoFactura, as: 'pagos' }], // Incluir pagos para verificar
      transaction
    });

    if (!factura) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Factura no encontrada' }, { status: 404 });
    }

    // Opcional: No permitir eliminar si tiene pagos asociados
    if (factura.pagos && factura.pagos.length > 0) {
      await transaction.rollback();
      return NextResponse.json({ message: 'No se puede eliminar la factura porque tiene pagos asociados. Considere anularla.' }, { status: 400 });
    }

    // Eliminar renglones asociados primero (si no tienes CASCADE DELETE en DB)
    await db.RenglonFactura.destroy({
      where: { facturaId: factura.id },
      transaction
    });

    await factura.destroy({ transaction });
    await transaction.commit();
    return NextResponse.json({ message: 'Factura eliminada exitosamente' }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting factura:', error);
    return NextResponse.json({ message: 'Error al eliminar factura', error: error.message }, { status: 500 });
  }
}