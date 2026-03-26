import { NextResponse } from "next/server";
import db from "@/models";

export async function POST(request, { params }) {
    const t = await db.sequelize.transaction();
    try {
        const { id } = await params; // ID de la Requisicion
        const { ganadores } = await request.json(); 
        // ganadores = { requisicionDetalleId: cotizacionIdGanadora }

        // 1. Validar que la Requisición exista y esté En Cotizacion
        const requisicion = await db.Requisicion.findByPk(id, {
            include: [
                { model: db.RequisicionDetalle, as: 'detalles' },
                { 
                    model: db.Cotizacion, 
                    as: 'cotizaciones',
                    include: [{ model: db.CotizacionDetalle, as: 'detalles' }]
                }
            ],
            transaction: t
        });

        if (!requisicion || requisicion.estado !== 'En Cotizacion') {
            throw new Error("La requisición no es válida o no está en fase de cotización.");
        }

        // 2. Procesar Ganadores y Perdedores en CotizacionDetalle
        const itemsGanadoresPorCotizacion = {}; // Agrupamos para generar Órdenes de Compra

        for (const cotizacion of requisicion.cotizaciones) {
            let ganoAlMenosUno = false;
            let perdioAlMenosUno = false;

            for (const detalle of cotizacion.detalles) {
                const idCotizacionGanadora = ganadores[detalle.requisicionDetalleId];
                
                if (idCotizacionGanadora === cotizacion.id) {
                    // Este detalle GANÓ
                    await detalle.update({ estadoSeleccion: 'Ganador' }, { transaction: t });
                    ganoAlMenosUno = true;

                    // Agrupamos para la Orden de Compra
                    if (!itemsGanadoresPorCotizacion[cotizacion.id]) {
                        itemsGanadoresPorCotizacion[cotizacion.id] = {
                            cotizacionBase: cotizacion,
                            items: []
                        };
                    }
                    itemsGanadoresPorCotizacion[cotizacion.id].items.push(detalle);

                } else {
                    // Este detalle PERDIÓ
                    await detalle.update({ estadoSeleccion: 'Perdedor' }, { transaction: t });
                    perdioAlMenosUno = true;
                }
            }

            // 3. Actualizar el estado de la Cotización Cabecera
            let nuevoEstadoCot = 'Rechazada';
            if (ganoAlMenosUno && perdioAlMenosUno) nuevoEstadoCot = 'Seleccionada Parcial';
            if (ganoAlMenosUno && !perdioAlMenosUno) nuevoEstadoCot = 'Seleccionada Total';

            await cotizacion.update({ 
                estado: nuevoEstadoCot,
                esSeleccionada: ganoAlMenosUno
            }, { transaction: t });
        }

        // 4. Generar las Órdenes de Compra (Una por cada proveedor ganador)
        const year = new Date().getFullYear();
        let ocCount = await db.OrdenCompra.count({ transaction: t });

        for (const [cotizacionId, data] of Object.entries(itemsGanadoresPorCotizacion)) {
            ocCount++;
            const numeroOC = `OC-${year}-${String(ocCount).padStart(4, '0')}`;
            
            // Calculamos monto total real de los items ganadores
            const montoTotal = data.items.reduce((sum, item) => sum + (parseFloat(item.precioUnitario) * parseFloat(item.cantidadOfertada)), 0);

            // Crear Cabecera OC
            const nuevaOC = await db.OrdenCompra.create({
                numeroOrden: numeroOC,
                proveedorId: data.cotizacionBase.proveedorId,
                estado: 'Aprobada',
                montoTotalEstimado: montoTotal,
                montoTotalReal: montoTotal,
                justificacion: `Generada automáticamente desde Requisición ${requisicion.codigo}`
            }, { transaction: t });

            // Crear Detalles OC (Asumo que tienes modelo OrdenCompraItem según tu associate)
            const ocItems = data.items.map(cd => ({
                ordenCompraId: nuevaOC.id,
                consumibleId: cd.consumibleId,
                cantidad: cd.cantidadOfertada,
                precioUnitario: cd.precioUnitario,
                subtotal: parseFloat(cd.precioUnitario) * parseFloat(cd.cantidadOfertada)
            }));

            await db.OrdenCompraItem.bulkCreate(ocItems, { transaction: t });
        }

        // 5. Cerrar la Requisición
        await requisicion.update({ estado: 'Aprobada' }, { transaction: t });

        // Si la requisición viene de un Hallazgo, podríamos actualizar el estado del Hallazgo aquí
        if (requisicion.hallazgoId) {
            await db.Hallazgo.update(
                { estado: 'Repuesto en Procura' },
                { where: { id: requisicion.hallazgoId }, transaction: t }
            );
        }

        await t.commit();
        return NextResponse.json({ success: true, message: 'Cuadro comparativo procesado y ODTs generadas' });

    } catch (error) {
        await t.rollback();
        console.error("Error en Aprobar Cuadro:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}