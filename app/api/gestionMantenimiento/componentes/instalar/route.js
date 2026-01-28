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
            ubicacionFisica, // Variable global
            serialesSeleccionados // Array: [{ value: '...', type: '...', ubicacion: '...' }]
        } = body;

        const articulo = await db.Consumible.findByPk(inventarioId, { transaction: t });
        if (!articulo) throw new Error("Artículo no encontrado");

        // Helper para Salidas
        const registrarSalida = async (cant, costoUnitario) => {
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
                    // --- SERIAL EXISTENTE ---
                    serialObj = await db.ConsumibleSerializado.findByPk(item.value, { transaction: t });
                    if (!serialObj) throw new Error(`Serial ID ${item.value} no encontrado`);

                    // Validación estricta: solo si está en almacén
                    if (serialObj.estado !== 'almacen') {
                        throw new Error(`El serial ${serialObj.serial} no está disponible (Estado: ${serialObj.estado})`);
                    }

                    await serialObj.update({
                        estado: 'asignado',
                        activoId: activoId,
                        subsistemaInstanciaId: subsistemaInstanciaId,
                        fechaAsignacion: new Date(),

                        // Opcional: ¿Quieres actualizar la fecha de compra si era existente? 
                        // Si estaba null o quieres corregirla, descomenta:
                        fechaCompra: item.fechaCompra || serialObj.fechaCompra,

                        // Actualizar garantía siempre es útil
                        fechaVencimientoGarantia: item.fechaGarantia
                    }, { transaction: t });

                    await registrarSalida(1, articulo.precioPromedio);

                } else {
                    // --- NUEVO ---
                    serialObj = await db.ConsumibleSerializado.create({
                        consumibleId: inventarioId,
                        serial: item.value,
                        estado: 'asignado',
                        activoId: activoId,
                        subsistemaInstanciaId: subsistemaInstanciaId,
                        fechaAsignacion: new Date(),

                        // GUARDAMOS LAS FECHAS NUEVAS
                        fechaCompra: item.fechaCompra || new Date(),
                        fechaVencimientoGarantia: item.fechaGarantia // Puede ser null
                    }, { transaction: t });

                    // IMPORTANTE: Crear la trazabilidad de entrada (Auditoría ERP)
                    await db.EntradaInventario.create({
                        consumibleId: inventarioId,
                        cantidad: 1,
                        costoUnitario: articulo.precioPromedio || 0,
                        tipo: 'Otro',
                        observacion: `Ingreso Rápido (Instalación) - Serial: ${item.value}`,
                        fecha: new Date()
                    }, { transaction: t });

                    // Solo aumentamos el patrimonio total (Asignado)
                    await articulo.increment('stockAsignado', { by: 1, transaction: t });
                }

                // Registro de Instalación
                await db.ConsumibleInstalado.create({
                    subsistemaInstanciaId,
                    consumibleId: inventarioId,
                    recomendacionId,
                    serialActual: serialObj.serial,
                    serialId: serialObj.id, // Usamos serialId como acordamos
                    cantidad: 1,

                    // Prioridad: Ubicación específica > Ubicación global
                    ubicacion: item.ubicacion || ubicacionFisica,

                    fechaInstalacion: new Date(),
                    vidaUtilRestante: articulo.vidaUtilEstimada || 100,
                    estado: 'instalado',
                }, { transaction: t });
            }

        } else {
            // ==========================================
            // CASO B: FUNGIBLE (Aceite, etc)
            // ==========================================
            if (parseFloat(articulo.stockAlmacen) < parseFloat(cantidad)) {
                throw new Error(`Stock insuficiente. Disponible: ${articulo.stockAlmacen}`);
            }

            await db.ConsumibleInstalado.create({
                subsistemaInstanciaId,
                consumibleId: inventarioId,
                recomendacionId,
                cantidad: cantidad,
                fechaInstalacion: new Date(),
                vidaUtilRestante: 100,
                estado: 'instalado',

                // CORREGIDO AQUÍ:
                ubicacion: ubicacionFisica,

            }, { transaction: t });

            await registrarSalida(cantidad, articulo.precioPromedio);
        }

        await t.commit();
        return NextResponse.json({ success: true });

    } catch (error) {
        await t.rollback();
        console.error("Error instalando componente:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}