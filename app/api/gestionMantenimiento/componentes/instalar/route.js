import { NextResponse } from "next/server";
import db from "@/models";
import { sequelize } from "@/models";

export async function POST(request) {
    const t = await sequelize.transaction();
    try {
        const body = await request.json();
        const {
            activoId,
            subsistemaInstanciaId,
            recomendacionId,
            inventarioId,
            cantidad,
            ubicacionFisica, 
            serialesSeleccionados,
            esAsentamiento // 🔥 LA VARIABLE MÁGICA RECIBIDA DEL FRONTEND 🔥
        } = body;

        const articulo = await db.Consumible.findByPk(inventarioId, { transaction: t });
        if (!articulo) throw new Error("Artículo no encontrado");

        // ==========================================
        // HELPER INTELIGENTE: REGISTRAR SALIDA Y MOVER STOCK
        // ==========================================
        const registrarSalida = async (cant, costoUnitario, serialValue = null) => {
            if (esAsentamiento) {
                // MODO ASENTAMIENTO: NO tocamos el almacén, porque la pieza nunca estuvo ahí.
                // Pero SÍ aumentamos el patrimonio rodante de la empresa.
                await articulo.increment('stockAsignado', { by: cant, transaction: t });
                
                // Dejamos un rastro contable para auditorías
                await db.SalidaInventario.create({
                    consumibleId: inventarioId,
                    activoId: activoId,
                    cantidad: cant,
                    fecha: new Date(),
                    justificacion: serialValue 
                        ? `Asentamiento Inicial de Inventario (Pre-instalado) - Serial: ${serialValue}`
                        : 'Asentamiento Inicial de Inventario (Pre-instalado)',
                    costoAlMomento: costoUnitario || 0
                }, { transaction: t });

                return; // Cortamos la ejecución aquí
            }

            // FLUJO NORMAL: Mantenimiento del día a día
            await db.SalidaInventario.create({
                consumibleId: inventarioId,
                activoId: activoId,
                cantidad: cant,
                fecha: new Date(),
                justificacion: 'Instalación en Activo (Mantenimiento)',
                costoAlMomento: costoUnitario || 0
            }, { transaction: t });

            await articulo.decrement('stockAlmacen', { by: cant, transaction: t });
            await articulo.increment('stockAsignado', { by: cant, transaction: t });
        };

        // ==========================================
        // CASO A: ARTÍCULO SERIALIZADO
        // ==========================================
        if (articulo.tipo === 'serializado') {
            if (!serialesSeleccionados || serialesSeleccionados.length === 0) {
                throw new Error("Debe seleccionar los seriales para este componente");
            }

            for (const item of serialesSeleccionados) {
                let serialObj;

                if (item.type === 'existing') {
                    // --- SERIAL EXISTENTE EN ALMACÉN ---
                    if (esAsentamiento) {
                         // Lógica dura: Si está en el almacén físico, no puedes decir que "ya estaba en el camión" de la nada.
                         throw new Error(`El serial ${item.value} ya existe en el almacén. Desactive el Modo Asentamiento para instalarlo normalmente.`);
                    }

                    serialObj = await db.ConsumibleSerializado.findByPk(item.value, { transaction: t });
                    if (!serialObj) throw new Error(`Serial ID ${item.value} no encontrado`);
                    if (serialObj.estado !== 'almacen') {
                        throw new Error(`El serial ${serialObj.serial} no está disponible (Estado: ${serialObj.estado})`);
                    }

                    await serialObj.update({
                        estado: 'asignado',
                        activoId: activoId,
                        subsistemaInstanciaId: subsistemaInstanciaId,
                        fechaAsignacion: new Date(),
                        fechaCompra: item.fechaCompra || serialObj.fechaCompra,
                        fechaVencimientoGarantia: item.fechaGarantia
                    }, { transaction: t });

                    await registrarSalida(1, articulo.precioPromedio, serialObj.serial);

                } else {
                    // --- SERIAL NUEVO (Ideal para Asentamientos) ---
                    serialObj = await db.ConsumibleSerializado.create({
                        consumibleId: inventarioId,
                        serial: item.value,
                        estado: 'asignado', // Nace directamente en el chuto
                        activoId: activoId,
                        subsistemaInstanciaId: subsistemaInstanciaId,
                        fechaAsignacion: new Date(),
                        fechaCompra: item.fechaCompra || new Date(),
                        fechaVencimientoGarantia: item.fechaGarantia 
                    }, { transaction: t });

                    // Si NO es asentamiento, significa que compraron el caucho y lo montaron directo sin meterlo al almacén.
                    // Si SÍ es asentamiento, esta entrada inicializamos el stock.
                    if (!esAsentamiento) {
                        await db.EntradaInventario.create({
                            consumibleId: inventarioId,
                            cantidad: 1,
                            costoUnitario: articulo.precioPromedio || 0,
                            tipo: 'Otro',
                            observacion: `Ingreso Rápido y Montaje Directo - Serial: ${item.value}`,
                            fecha: new Date()
                        }, { transaction: t });
                    }

                    await registrarSalida(1, articulo.precioPromedio, item.value);
                }

                // Registro de Instalación Histórica
                await db.ConsumibleInstalado.create({
                    subsistemaInstanciaId,
                    consumibleId: inventarioId,
                    recomendacionId,
                    serialActual: serialObj.serial,
                    serialId: serialObj.id, 
                    cantidad: 1,
                    ubicacion: item.ubicacion || ubicacionFisica,
                    fechaInstalacion: new Date(),
                    vidaUtilRestante: articulo.vidaUtilEstimada || 100,
                    estado: 'instalado',
                }, { transaction: t });
            }

        } else {
            // ==========================================
            // CASO B: FUNGIBLE (Pastillas, Aceite, Filtros)
            // ==========================================
            if (!esAsentamiento && parseFloat(articulo.stockAlmacen) < parseFloat(cantidad)) {
                // Solo detenemos la operación por falta de stock si es un mantenimiento normal
                throw new Error(`Stock insuficiente. Disponible en Almacén: ${articulo.stockAlmacen}`);
            }

            await registrarSalida(cantidad, articulo.precioPromedio);

            await db.ConsumibleInstalado.create({
                subsistemaInstanciaId,
                consumibleId: inventarioId,
                recomendacionId,
                cantidad: cantidad,
                fechaInstalacion: new Date(),
                vidaUtilRestante: 100,
                estado: 'instalado',
                ubicacion: ubicacionFisica,
            }, { transaction: t });
        }

        await t.commit();
        return NextResponse.json({ success: true });

    } catch (error) {
        await t.rollback();
        console.error("Error instalando componente:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}