import { NextResponse } from 'next/server';
import { 
    sequelize, OrdenMantenimiento, MantenimientoRepuesto, 
    Consumible, Requisicion, RequisicionDetalle, Hallazgo 
} from '@/models';

export async function POST(request) {
    const t = await sequelize.transaction();
    try {
        const body = await request.json(); 
        // Payload esperado: 
        // { activoId, usuarioId, tipo, hallazgosIds: [], repuestos: [{ consumibleId, cantidad }] }

        // 1. Crear la Orden de Mantenimiento (Cabecera)
        const codigoOM = `OM-${Date.now().toString().slice(-6)}`; // Generador simple de código
        const orden = await OrdenMantenimiento.create({
            codigo: codigoOM,
            activoId: body.activoId,
            creadoPorId: body.usuarioId,
            tipo: body.tipo || 'Correctivo',
            estado: 'Diagnostico', // Estado inicial temporal
            prioridad: 'Media'
        }, { transaction: t });

        // 2. Vincular Hallazgos (si existen)
        if (body.hallazgosIds && body.hallazgosIds.length > 0) {
            await Hallazgo.update(
                { ordenMantenimientoId: orden.id, estado: 'En Reparacion' },
                { where: { id: body.hallazgosIds }, transaction: t }
            );
        }

        // Listas para clasificar items
        const itemsParaRequisicion = [];
        let ordenRequiereStock = false;

        // 3. Procesar Repuestos
        if (body.repuestos && body.repuestos.length > 0) {
            for (const item of body.repuestos) {
                const consumible = await Consumible.findByPk(item.consumibleId, { transaction: t });
                
                // Cantidad que necesitamos vs lo que hay en almacén
                const cantidadRequerida = parseFloat(item.cantidad);
                const stockActual = parseFloat(consumible.stockAlmacen);
                
                let estadoLinea = 'En Stock';
                
                if (stockActual < cantidadRequerida) {
                    // FALTA STOCK
                    ordenRequiereStock = true;
                    estadoLinea = 'Sin Stock';
                    
                    // Calculamos el déficit (o pedimos todo, según política. Aquí pido el déficit)
                    const cantidadFaltante = cantidadRequerida - stockActual;
                    
                    itemsParaRequisicion.push({
                        consumibleId: item.consumibleId,
                        cantidad: cantidadFaltante // Pedimos a compras solo lo que falta
                    });
                } 

                // Creamos la línea en la Orden de Mantenimiento
                await MantenimientoRepuesto.create({
                    ordenMantenimientoId: orden.id,
                    consumibleId: item.consumibleId,
                    cantidadRequerida: cantidadRequerida,
                    estado: estadoLinea
                }, { transaction: t });
            }
        }

        // 4. GENERACIÓN AUTOMÁTICA DE REQUISICIÓN
        if (itemsParaRequisicion.length > 0) {
            // Crear cabecera de Requisición
            const codigoReq = `REQ-${Date.now().toString().slice(-6)}`;
            const nuevaRequisicion = await Requisicion.create({
                codigo: codigoReq,
                fechaSolicitud: new Date(),
                justificacion: `Generada autom. por falta de stock en ${codigoOM}`,
                prioridad: 'Alta', // Alta porque hay una máquina parada o esperando
                estado: 'Pendiente',
                ordenMantenimientoId: orden.id,
                solicitadoPorId: body.usuarioId
            }, { transaction: t });

            // Crear detalles de Requisición
            const detallesReq = itemsParaRequisicion.map(item => ({
                requisicionId: nuevaRequisicion.id,
                consumibleId: item.consumibleId,
                cantidadSolicitada: item.cantidad
            }));
            
            await RequisicionDetalle.bulkCreate(detallesReq, { transaction: t });
            
            // Actualizar estado de la Orden
            await orden.update({ estado: 'Esperando Stock' }, { transaction: t });
        } else {
            // Si no falta nada, la orden pasa directo a 'Por Ejecutar'
            await orden.update({ estado: 'Por Ejecutar' }, { transaction: t });
        }

        await t.commit();

        return NextResponse.json({ 
            success: true, 
            message: ordenRequiereStock 
                ? 'Orden creada. Se generó requisición automática por falta de stock.' 
                : 'Orden creada. Repuestos disponibles en almacén.',
            data: orden 
        });

    } catch (error) {
        await t.rollback();
        console.error('Error creando OM:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}