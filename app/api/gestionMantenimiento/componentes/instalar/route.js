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
      ubicacion,
      cantidad, // Cantidad total (ej: 10)
      ubicacionFisica,
      serialesSeleccionados // Array: [{ value: '55', type: 'existing' }, ...]
    } = body;

    // 1. Buscamos el artículo padre para saber costos y datos
    const articulo = await db.Consumible.findByPk(inventarioId, { transaction: t });
    if (!articulo) throw new Error("Artículo no encontrado");

    // Función auxiliar para registrar la salida contable
    const registrarSalida = async (cant, costoUnitario) => {
        // A. Crear registro histórico de salida
        await db.SalidaInventario.create({
            consumibleId: inventarioId,
            activoId: activoId,
            cantidad: cant,
            fecha: new Date(),
            justificacion: 'Instalación en Activo (Mantenimiento)',
            costoAlMomento: costoUnitario || 0
        }, { transaction: t });

        // B. Ajustar contadores del Padre (Consumible)
        // Restamos de almacén y sumamos a asignado
        await articulo.decrement('stockAlmacen', { by: cant, transaction: t });
        await articulo.increment('stockAsignado', { by: cant, transaction: t });
    };

    // ==========================================
    // CASO A: ARTÍCULO SERIALIZADO
    // ==========================================
    if (articulo.tipo === 'serializado') { // Usamos tu campo 'tipo' del modelo
        
        if (!serialesSeleccionados || serialesSeleccionados.length === 0) {
            throw new Error("Debe seleccionar los seriales para este componente");
        }

        for (const item of serialesSeleccionados) {
            let serialObj;

            if (item.type === 'existing') {
                // --- SERIAL EXISTENTE EN ALMACÉN ---
                serialObj = await db.ConsumibleSerializado.findByPk(item.value, { transaction: t });
                
                if (!serialObj) throw new Error(`Serial ID ${item.value} no encontrado`);
                if (serialObj.estado !== 'almacen') throw new Error(`El serial ${serialObj.serial} no está en almacén (Estado: ${serialObj.estado})`);

                // 1. Actualizar estado del serial
                await serialObj.update({ 
                    estado: 'asignado', // O 'en_uso' según tu enum
                    activoId: activoId, // Vinculamos al activo físicamente
                    subsistemaInstanciaId: subsistemaInstanciaId,
                    fechaAsignacion: new Date()
                }, { transaction: t });

                // 2. Mover Contadores y Crear Salida (1 unidad)
                await registrarSalida(1, articulo.precioPromedio);

            } else {
                // --- SERIAL NUEVO (CREADO AL VUELO) ---
                // Si el usuario metió un serial nuevo, asumimos que "apareció" y se instaló.
                // Esto es una entrada implícita y una salida inmediata.
                // Para no complicar la contabilidad, solo aumentamos el 'stockAsignado' global, 
                // pero NO restamos de 'stockAlmacen' (porque nunca estuvo allí registrado).
                
                serialObj = await db.ConsumibleSerializado.create({
                    consumibleId: inventarioId,
                    serial: item.value,
                    estado: 'asignado',
                    activoId: activoId,
                    subsistemaInstanciaId: subsistemaInstanciaId,
                    fechaAsignacion: new Date(),
                    fechaCompra: new Date() // Asumimos compra hoy
                }, { transaction: t });

                // Solo incrementamos lo asignado (Inventario Total crece)
                await articulo.increment('stockAsignado', { by: 1, transaction: t });
                
                // Opcional: Crear una EntradaInventario y luego una SalidaInventario si quieres trazabilidad perfecta
                // Por ahora, lo dejamos simple.
            }

            // 3. Crear el registro de Instalación (Historial del Activo)
            await db.ConsumibleInstalado.create({
                subsistemaInstanciaId,
                consumibleId: inventarioId,
                recomendacionId,
                serialActual: serialObj.serial,
                // Si tu modelo tiene FK a serial, úsala:
                serialId: serialObj.id, 
                cantidad: 1, 
                ubicacion,
                fechaInstalacion: new Date(),
                vidaUtilRestante: articulo.vidaUtilEstimada || 100, // Default por si acaso
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

        // 1. Crear registro de instalación
        await db.ConsumibleInstalado.create({
            subsistemaInstanciaId,
            consumibleId: inventarioId,
            recomendacionId,
            cantidad: cantidad,
            fechaInstalacion: new Date(),
            vidaUtilRestante: 100, // % o Horas
            estado: 'instalado',
            ubicacion,
        }, { transaction: t });

        // 2. Mover Contadores y Crear Salida
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