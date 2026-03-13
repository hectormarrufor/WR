import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import {
    OrdenMantenimiento,
    MantenimientoRepuesto,
    Consumible,
    Requisicion,
    RequisicionDetalle,
    Hallazgo
} from '@/models'; // Ajusta la ruta a tu index de modelos
import { notificarCabezas } from '@/app/api/notificar/route';

export async function POST(req) {
    // Iniciar una transacción para asegurar que si algo falla, no se guarde nada a medias
    const t = await sequelize.transaction();

    try {
        const body = await req.json();
        const {
            activoId,
            creadoPorId,
            asignadoAId,
            tipo,
            prioridad,
            diagnosticoTecnico,
            repuestosPedidos, // Array: [{ consumibleId: 1, cantidad: 2 }, ...]
            hallazgosIds      // Array: [1, 5] (Los hallazgos que esta OM va a resolver)
        } = body;

        // 1. Crear la Orden de Mantenimiento (OM)
        const nuevaOM = await OrdenMantenimiento.create({
            codigo: `OM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`, // Generador simple, puedes mejorarlo
            activoId,
            creadoPorId,
            asignadoAId,
            tipo,
            prioridad,
            diagnosticoTecnico,
            estado: 'Diagnostico' // Empieza en diagnóstico hasta evaluar el stock
        }, { transaction: t });

        // 2. Asociar los Hallazgos a esta OM y pasarlos a "En Reparacion"
        if (hallazgosIds && hallazgosIds.length > 0) {
            await Hallazgo.update(
                { ordenMantenimientoId: nuevaOM.id, estado: 'En Reparacion' },
                { where: { id: hallazgosIds }, transaction: t }
            );
        }

        let necesitaCompras = false;
        const detallesRequisicion = []; // Aquí guardaremos lo que hay que comprar

        // 3. Procesar los Repuestos (El Algoritmo de Stock)
        if (repuestosPedidos && repuestosPedidos.length > 0) {
            for (const pedido of repuestosPedidos) {
                // Bloqueamos la fila del consumible momentáneamente para evitar doble consumo
                const consumible = await Consumible.findByPk(pedido.consumibleId, { transaction: t, lock: true });

                if (!consumible) throw new Error(`Consumible ID ${pedido.consumibleId} no encontrado`);

                let cantReservada = 0;
                let estadoRepuesto = 'Validando';
                let faltante = 0;

                if (consumible.stockActual >= pedido.cantidad) {
                    // ESCENARIO A: Hay stock completo
                    cantReservada = pedido.cantidad;
                    estadoRepuesto = 'En Stock';
                    // Restamos del inventario físico
                    await consumible.update({
                        stockAlmacen: consumible.stockAlmacen - cantReservada,
                        stockAsignado: Number(consumible.stockAsignado) + cantReservada
                    }, { transaction: t });
                } else {
                    // ESCENARIO B: No hay o falta stock
                    cantReservada = consumible.stockActual; // Agarramos lo que haya (incluso 0)
                    faltante = pedido.cantidad - cantReservada;
                    estadoRepuesto = 'Sin Stock';
                    necesitaCompras = true;

                    if (cantReservada > 0) {
                        await consumible.update({ stockActual: 0 }, { transaction: t }); // Vaciamos el almacén
                    }
                }

                // Guardar la línea en la OM
                const lineaRepuesto = await MantenimientoRepuesto.create({
                    ordenMantenimientoId: nuevaOM.id,
                    consumibleId: consumible.id,
                    cantidadRequerida: pedido.cantidad,
                    cantidadDespachada: cantReservada,
                    estado: estadoRepuesto
                }, { transaction: t });

                // Si falta, preparamos el array para la Requisición usando tu "Puente de Oro"
                if (faltante > 0) {
                    detallesRequisicion.push({
                        consumibleId: consumible.id,
                        cantidadSolicitada: faltante,
                        estado: 'Pendiente',
                        mantenimientoRepuestoId: lineaRepuesto.id // 🔥 EL PUENTE DE ORO 🔥
                    });
                }
            }
        }

        // 4. Crear Requisición Automática si faltó stock
        if (necesitaCompras) {
            // Pasamos la OM a Esperando Stock
            await nuevaOM.update({ estado: 'Esperando Stock' }, { transaction: t });

            const nuevaReq = await Requisicion.create({
                codigo: `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                prioridad: prioridad === 'Emergencia' ? 'Critica' : (prioridad === 'Alta' ? 'Alta' : 'Media'),
                justificacion: `Autogenerada por falta de stock para la ${nuevaOM.codigo}. Activo ID: ${activoId}`,
                ordenMantenimientoId: nuevaOM.id,
                solicitadoPorId: creadoPorId,
                estado: 'Pendiente'
            }, { transaction: t });

            // Insertar todos los detalles de la requisición en lote, inyectando el ID de la nueva REQ
            const detallesAInsertar = detallesRequisicion.map(d => ({ ...d, requisicionId: nuevaReq.id }));
            await RequisicionDetalle.bulkCreate(detallesAInsertar, { transaction: t });

            // Actualizar el estado de la línea del repuesto a 'En Requisicion'
            const lineasIds = detallesRequisicion.map(d => d.mantenimientoRepuestoId);
            await MantenimientoRepuesto.update(
                { estado: 'En Requisicion', requisicionId: nuevaReq.id },
                { where: { id: lineasIds }, transaction: t }
            );

            // 5. Enviar Notificación a Compras
            await notificarCabezas({
                title: `🛒 Requisición Urgente: ${nuevaReq.codigo}`,
                body: `La ${nuevaOM.codigo} quedó detenida por falta de ${detallesRequisicion.length} tipos de repuestos.`,
                url: `/superuser/compras/requisiciones/${nuevaReq.id}`,
                tag: 'nueva-req'
            });

        } else {
            // Si había todo el stock, la orden pasa a Por Ejecutar para que el mecánico empiece
            await nuevaOM.update({ estado: 'Por Ejecutar' }, { transaction: t });
        }

        // Confirmar la transacción (Guardar en la DB)
        await t.commit();

        return NextResponse.json({
            success: true,
            data: nuevaOM,
            mensaje: necesitaCompras
                ? 'OM creada pero en pausa. Requisición enviada a Compras.'
                : 'OM creada y lista para ejecución. Repuestos reservados.'
        });

    } catch (error) {
        // Si algo falla, deshacemos todo
        await t.rollback();
        console.error("Error creando OM:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}