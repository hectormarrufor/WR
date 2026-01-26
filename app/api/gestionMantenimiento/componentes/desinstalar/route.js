import { NextResponse } from "next/server";
import db from "@/models"; 
import { sequelize } from "@/models";

export async function DELETE(request) {
  const t = await sequelize.transaction();
  try {
    const { searchParams } = new URL(request.url);
    const instalacionId = searchParams.get('id');
    const motivo = searchParams.get('motivo'); // 'error' o 'desgaste'
    const nota = searchParams.get('nota') || '';

    if (!instalacionId) throw new Error("ID requerido");
    if (!motivo) throw new Error("Motivo de retiro requerido");

    // 1. Buscar Datos
    const instalacion = await db.ConsumibleInstalado.findByPk(instalacionId, {
        include: [
            { model: db.Consumible, as: 'fichaTecnica' },
            { model: db.SubsistemaInstancia, as: 'subsistema' }
        ],
        transaction: t
    });

    if (!instalacion) throw new Error("Instalación no encontrada");

    const consumibleId = instalacion.consumibleId;
    const cantidad = parseFloat(instalacion.cantidad);
    const activoId = instalacion.subsistema?.activoId;

    // --- BIFURCACIÓN DE LÓGICA ---

    if (motivo === 'error') {
        // ==========================================
        // CASO 1: FUE UN ERROR (REVERSO)
        // ==========================================
        
        // A. Serial vuelve a Almacén
        if (instalacion.serialId) {
            await db.ConsumibleSerializado.update({
                estado: 'almacen',
                activoId: null,
                subsistemaInstanciaId: null,
                fechaRetiro: null // Limpiamos si tenía
            }, { where: { id: instalacion.serialId }, transaction: t });
        }

        // B. Contabilidad: Devuelve al Stock Disponible (+)
        await db.Consumible.increment('stockAlmacen', { by: cantidad, where: { id: consumibleId }, transaction: t });
        
        // C. Contabilidad: Resta de Asignado (-)
        await db.Consumible.decrement('stockAsignado', { by: cantidad, where: { id: consumibleId }, transaction: t });

        // D. Auditoría: Entrada por Devolución
        await db.EntradaInventario.create({
            consumibleId: consumibleId,
            cantidad: cantidad,
            costoUnitario: instalacion.fichaTecnica?.precioPromedio || 0,
            tipo: 'Otro',
            observacion: `Corrección: Devolución desde Activo #${activoId}`,
            fecha: new Date(),
        }, { transaction: t });

    } else {
        // ==========================================
        // CASO 2: DAÑO / DESGASTE (BAJA DEFINITIVA)
        // ==========================================

        // A. Serial muere (Estado 'retirado')
        if (instalacion.serialId) {
            await db.ConsumibleSerializado.update({
                estado: 'retirado', // YA NO VUELVE AL SELECTOR
                activoId: null,     // Sale del camión
                subsistemaInstanciaId: null,
                fechaRetiro: new Date()
            }, { where: { id: instalacion.serialId }, transaction: t });
        }

        // B. Contabilidad: Stock Almacén NO SE TOCA (Ya salió hace tiempo)
        // Solo restamos de "Asignado" porque ya no está rodando en la calle.
        await db.Consumible.decrement('stockAsignado', { by: cantidad, where: { id: consumibleId }, transaction: t });

        // C. Auditoría: No creamos Entrada. 
        // Podríamos crear un registro de "DisposiciónFinal" si tuvieras esa tabla,
        // pero por ahora basta con que el serial quede en 'retirado'.
    }

    // 2. Finalmente borramos el registro de instalación del camión
    // (Opcional: podrías moverlo a una tabla histórica 'ConsumiblesHistoricos' si quisieras guardar qué llanta usó en 2024,
    // pero 'destroy' está bien si solo te interesa lo actual).
    await instalacion.destroy({ transaction: t });

    await t.commit();
    return NextResponse.json({ success: true });

  } catch (error) {
    await t.rollback();
    console.error("Error desinstalando:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}