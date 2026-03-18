import { NextResponse } from 'next/server';
import sequelize from '@/sequelize';
import { 
    OrdenMantenimiento, 
    MantenimientoRepuesto, 
    Consumible, 
    Requisicion, 
    RequisicionDetalle,
    Hallazgo
} from '@/models';
import { notificarCabezas } from '@/app/api/notificar/route'; 

export async function POST(req) {
    const t = await sequelize.transaction();

    try {
        const body = await req.json();
        const { 
            activoId, creadoPorId, asignadoAId, tipo, prioridad, 
            diagnosticoTecnico, repuestosPedidos, hallazgosIds 
        } = body;

        // 1. Crear la Orden de Mantenimiento (OM)
        const nuevaOM = await OrdenMantenimiento.create({
            codigo: `OM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            activoId,
            creadoPorId,
            asignadoAId,
            tipo,
            prioridad,
            diagnosticoTecnico,
            estado: 'Diagnostico' // Estado temporal mientras calculamos el stock
        }, { transaction: t });

        // 2. Asociar y actualizar los Hallazgos a "En Reparacion"
        if (hallazgosIds && hallazgosIds.length > 0) {
            await Hallazgo.update(
                { ordenMantenimientoId: nuevaOM.id, estado: 'En Reparacion' },
                { where: { id: hallazgosIds }, transaction: t }
            );
        }

        let necesitaCompras = false;
        const detallesRequisicion = []; // Array para armar la orden de compra si falta algo

        // 3. LA MAGIA DEL INVENTARIO: Procesar cada repuesto pedido
        if (repuestosPedidos && repuestosPedidos.length > 0) {
            for (const pedido of repuestosPedidos) {
                // Bloqueamos la fila para que dos OMs al mismo tiempo no agarren el mismo filtro
                const consumible = await Consumible.findByPk(pedido.consumibleId, { transaction: t, lock: true });
                
                if (!consumible) throw new Error(`Consumible no encontrado`);

                let cantReservada = 0;
                let faltante = 0;
                let estadoLinea = 'Validando';

                // Convertimos a Number para evitar problemas de strings en las matemáticas
                const stockDisponible = Number(consumible.stockAlmacen);
                const cantPedida = Number(pedido.cantidad);

                if (stockDisponible >= cantPedida) {
                    // ESCENARIO A: TENEMOS STOCK COMPLETO
                    cantReservada = cantPedida;
                    estadoLinea = 'En Stock'; // Autorizado para retiro
                    
                    // Movemos el producto del Almacén Físico al área de "Asignados/Apartados"
                    await consumible.update({ 
                        stockAlmacen: stockDisponible - cantReservada,
                        stockAsignado: Number(consumible.stockAsignado) + cantReservada
                    }, { transaction: t });

                } else {
                    // ESCENARIO B: NO HAY O ESTÁ INCOMPLETO
                    cantReservada = stockDisponible; // Agarramos lo poco que haya
                    faltante = cantPedida - cantReservada;
                    estadoLinea = 'En Requisicion';
                    necesitaCompras = true;

                    if (cantReservada > 0) {
                        // Si había algo, vaciamos el almacén y lo pasamos a asignado
                        await consumible.update({ 
                            stockAlmacen: 0,
                            stockAsignado: Number(consumible.stockAsignado) + cantReservada
                        }, { transaction: t });
                    }
                }

                // Guardar la línea en la OM (cantidadDespachada aquí funge temporalmente como "Reservada")
                const lineaRepuesto = await MantenimientoRepuesto.create({
                    ordenMantenimientoId: nuevaOM.id,
                    consumibleId: consumible.id,
                    cantidadRequerida: cantPedida,
                    cantidadDespachada: cantReservada, 
                    estado: estadoLinea
                }, { transaction: t });

                // Si faltó stock, preparamos la data para la Requisición
                if (faltante > 0) {
                    detallesRequisicion.push({
                        consumibleId: consumible.id,
                        cantidadSolicitada: faltante,
                        estado: 'Pendiente',
                        mantenimientoRepuestoId: lineaRepuesto.id // 🔥 El puente directo a la OM 🔥
                    });
                }
            }
        }

        // 4. CREAR REQUISICIÓN Y NOTIFICAR A LA ALTA GERENCIA / COMPRAS
        if (necesitaCompras) {
            // La OM se pausa
            await nuevaOM.update({ estado: 'Esperando Stock' }, { transaction: t });

            // Nace la Requisición
            const nuevaReq = await Requisicion.create({
                codigo: `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                prioridad: prioridad === 'Emergencia' ? 'Critica' : (prioridad === 'Alta' ? 'Alta' : 'Media'),
                justificacion: `Paralización de equipo. Repuestos faltantes para ${nuevaOM.codigo}.`,
                ordenMantenimientoId: nuevaOM.id,
                solicitadoPorId: creadoPorId,
                estado: 'Pendiente'
            }, { transaction: t });

            // Insertamos todas las líneas a comprar amarradas a esta REQ
            const detallesAInsertar = detallesRequisicion.map(d => ({ ...d, requisicionId: nuevaReq.id }));
            await RequisicionDetalle.bulkCreate(detallesAInsertar, { transaction: t });

            // 🔥 NOTIFICACIÓN MULTICANAL (Compras + Presidente) 🔥
            // Tu función notificarCabezas enviará esto a los roles gerenciales configurados
            await notificarCabezas({
                title: `🚨 REQ URGE: Faltan Repuestos para ${nuevaOM.codigo}`,
                body: `Se requieren ${detallesRequisicion.length} items para continuar mantenimiento. Prioridad: ${nuevaReq.prioridad}.`,
                url: `/superuser/compras/requisiciones/${nuevaReq.id}`, // URL directa para que el de compras haga clic y vea
                tag: 'alerta-compras'
            });

        } else {
            // Si el almacén tenía todo, la OM pasa directo al mecánico
            await nuevaOM.update({ estado: 'Por Ejecutar' }, { transaction: t });
        }

        // Si llegamos hasta aquí sin errores, guardamos los cambios en la Base de Datos
        await t.commit();

        return NextResponse.json({ 
            success: true, 
            data: nuevaOM,
            mensaje: necesitaCompras 
                ? 'OM creada y Pausada. Requisición enviada a Compras y Presidencia.' 
                : 'OM creada. Repuestos reservados en almacén exitosamente.'
        });

    } catch (error) {
        // Rollback: Si algo falla (ej. error de internet), no se guarda nada a medias
        await t.rollback();
        console.error("Error crítico generando OM/Requisición:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}