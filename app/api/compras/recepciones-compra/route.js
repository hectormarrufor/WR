// app/api/superuser/compras/recepciones-compra/route.js
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import db from '../../../../models';


export async function POST(request) {
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { ordenCompraId, fechaRecepcion, numeroGuia, recibidaPorId, notas, detalles } = body;

    // 1. Validaciones iniciales
    if (!ordenCompraId || !detalles || detalles.length === 0) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Se requiere una Orden de Compra y al menos un detalle de recepción.' }, { status: 400 });
    }

    const ordenCompra = await db.OrdenCompra.findByPk(ordenCompraId, {
      include: [{ model: db.DetalleOrdenCompra, as: 'detalles' }],
      transaction,
      lock: transaction.LOCK.UPDATE, // Bloquear la OC para evitar concurrencia
    });

    if (!ordenCompra) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Orden de Compra no encontrada.' }, { status: 404 });
    }
    if (ordenCompra.estado === 'Recibida Completa' || ordenCompra.estado === 'Cancelada' || ordenCompra.estado === 'Rechazada') {
        await transaction.rollback();
        return NextResponse.json({ message: `No se puede recibir una Orden de Compra en estado "${ordenCompra.estado}".` }, { status: 400 });
    }

    // 2. Crear la Recepción de Compra
    const nuevaRecepcion = await db.RecepcionCompra.create({
      ordenCompraId: parseInt(ordenCompraId),
      fechaRecepcion: fechaRecepcion || new Date().toISOString().split('T')[0],
      numeroGuia,
      recibidaPorId: recibidaPorId ? parseInt(recibidaPorId) : null,
      notas,
      estadoRecepcion: 'Parcial', // Se determina al final si es completa
    }, { transaction });

    let totalItemsOrdenados = 0;
    let totalItemsRecibidosAcumulado = 0; // Suma de todos los recibidos hasta ahora para esta OC

    // Mapear los detalles de la orden de compra para fácil acceso por consumibleId
    const ocDetallesMap = new Map(ordenCompra.detalles.map(d => [d.consumibleId, d]));

    const detallesRecepcionCreados = [];
    const entradasInventarioCreadas = [];
    const consumiblesAActualizar = new Map(); // Para actualizar stock una sola vez por consumible

    // 3. Procesar cada detalle de la recepción
    for (const item of detalles) {
      const { consumibleId, cantidadRecibida, precioUnitarioActual, notas: detalleNotas } = item;
      const ocDetalle = ocDetallesMap.get(parseInt(consumibleId));

      if (!ocDetalle) {
        throw new Error(`Consumible con ID ${consumibleId} no encontrado en los detalles de la Orden de Compra.`);
      }

      const parsedCantidadRecibida = parseFloat(cantidadRecibida);
      if (isNaN(parsedCantidadRecibida) || parsedCantidadRecibida <= 0) {
        throw new Error(`Cantidad recibida inválida para consumible ID ${consumibleId}.`);
      }

      // Validar que no se reciba más de lo ordenado restante
      const cantidadOrdenada = parseFloat(ocDetalle.cantidad);
      const cantidadPreviamenteRecibida = parseFloat(ocDetalle.cantidadRecibida || 0);
      const cantidadPendiente = cantidadOrdenada - cantidadPreviamenteRecibida;

      if (parsedCantidadRecibida > cantidadPendiente) {
        throw new Error(`Se intenta recibir ${parsedCantidadRecibida} de ${ocDetalle.consumible.nombre}, pero solo quedan ${cantidadPendiente} pendientes para recibir.`);
      }

      // Crear DetalleRecepcionCompra
      const nuevoDetalleRecepcion = await db.DetalleRecepcionCompra.create({
        recepcionCompraId: nuevaRecepcion.id,
        consumibleId: parseInt(consumibleId),
        cantidadRecibida: parsedCantidadRecibida.toFixed(2),
        precioUnitarioActual: parseFloat(precioUnitarioActual || ocDetalle.precioUnitario).toFixed(2), // Usar precio de recepción o de OC
        notas: detalleNotas,
      }, { transaction });
      detallesRecepcionCreados.push(nuevoDetalleRecepcion);

      // Crear EntradaInventario
      const nuevaEntradaInventario = await db.EntradaInventario.create({
        consumibleId: parseInt(consumibleId),
        cantidad: parsedCantidadRecibida.toFixed(2),
        fechaEntrada: nuevaRecepcion.fechaRecepcion,
        motivo: `Recepción de OC ${ordenCompra.numeroOrden}`,
        responsableId: recibidaPorId ? parseInt(recibidaPorId) : null,
        detalleRecepcionCompraId: nuevoDetalleRecepcion.id, // Enlazar con el detalle de recepción
        tipoEntrada: 'Compra',
      }, { transaction });
      entradasInventarioCreadas.push(nuevaEntradaInventario);

      // 4. Actualizar Consumible (stockActual y precioUnitarioPromedio)
      const consumible = await db.Consumible.findByPk(parseInt(consumibleId), { transaction, lock: transaction.LOCK.UPDATE });
      if (!consumible) {
        throw new Error(`Consumible con ID ${consumibleId} no encontrado.`);
      }

      const currentStock = parseFloat(consumible.stockActual);
      const currentPrice = parseFloat(consumible.precioUnitarioPromedio);
      const newStock = currentStock + parsedCantidadRecibida;
      // Calcular nuevo precio promedio ponderado
      let newPrecioPromedio;
      if (newStock > 0) {
        newPrecioPromedio = ((currentStock * currentPrice) + (parsedCantidadRecibida * parseFloat(precioUnitarioActual || ocDetalle.precioUnitario))) / newStock;
      } else {
        newPrecioPromedio = 0;
      }

      consumible.stockActual = newStock.toFixed(2);
      consumible.precioUnitarioPromedio = newPrecioPromedio.toFixed(2);
      await consumible.save({ transaction }); // Guardar actualización del consumible

      // 5. Actualizar DetalleOrdenCompra (cantidadRecibida)
      ocDetalle.cantidadRecibida = (cantidadPreviamenteRecibida + parsedCantidadRecibida).toFixed(2);
      ocDetalle.recibidoCompletamente = (parseFloat(ocDetalle.cantidadRecibida) >= cantidadOrdenada);
      await ocDetalle.save({ transaction });

      // Sumar para verificar el estado final de la OC
      totalItemsOrdenados += cantidadOrdenada;
      totalItemsRecibidosAcumulado += (cantidadPreviamenteRecibida + parsedCantidadRecibida);
    }

    // 6. Actualizar el estado y totalRecibido de la Orden de Compra
    ordenCompra.totalRecibido = (parseFloat(ordenCompra.totalRecibido) + detallesRecepcionCreados.reduce((sum, d) => sum + parseFloat(d.cantidadRecibida), 0)).toFixed(2);

    let ocEstado = 'Recibida Parcial';
    if (totalItemsRecibidosAcumulado >= totalItemsOrdenados) {
      ocEstado = 'Recibida Completa';
    }
    ordenCompra.estado = ocEstado;
    await ordenCompra.save({ transaction });

    // 7. Actualizar el estado de la Recepción (puede ser parcial o completa para la OC)
    nuevaRecepcion.estadoRecepcion = ocEstado === 'Recibida Completa' ? 'Completa' : 'Parcial';
    await nuevaRecepcion.save({ transaction });


    await transaction.commit();

    const recepcionConDetalles = await db.RecepcionCompra.findByPk(nuevaRecepcion.id, {
      include: [
        { model: db.OrdenCompra, as: 'ordenCompra', include: [db.Proveedor] },
        { model: db.Empleado, as: 'recibidaPor' },
        { model: db.DetalleRecepcionCompra, as: 'detalles', include: [db.Consumible] },
      ],
    });

    return NextResponse.json(recepcionConDetalles, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creando recepción de compra:', error);
    return NextResponse.json({ message: 'Error al crear recepción de compra', error: error.message }, { status: 400 });
  }
}


export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query'); // Para búsquedas por número de OC, guía, etc.
        const ordenCompraId = searchParams.get('ordenCompraId'); // Para filtrar por una OC específica

        const whereClause = {};
        if (query) {
            whereClause[Op.or] = [
                { numeroGuia: { [Op.like]: `%${query}%` } },
                { '$ordenCompra.numeroOrden$': { [Op.like]: `%${query}%` } },
                { '$ordenCompra.proveedor.nombre$': { [Op.like]: `%${query}%` } },
            ];
        }
        if (ordenCompraId) {
            whereClause.ordenCompraId = parseInt(ordenCompraId);
        }

        const recepciones = await db.RecepcionCompra.findAll({
            where: whereClause,
            include: [
                { model: db.OrdenCompra, as: 'ordenCompra', include: [db.Proveedor] }, // Incluir proveedor
                { model: db.Empleado, as: 'recibidaPor' },
            ],
            order: [['fechaRecepcion', 'DESC'], ['createdAt', 'DESC']],
        });
        return NextResponse.json(recepciones);
    } catch (error) {
        console.error('Error fetching recepciones de compra:', error);
        return NextResponse.json({ message: 'Error al obtener recepciones de compra', error: error.message }, { status: 500 });
    }
}