// app/api/gestionMantenimiento/hallazgos/[id]/route.js
import { NextResponse } from "next/server";
import db from "@/models";

export async function PUT(request, { params }) {
    const { id } = params; // ID del Hallazgo
    const body = await request.json();
    const t = await db.sequelize.transaction();

    try {
        const { 
            subsistemaNombre, 
            consumibleNombre, 
            cantidadSlots, 
            impacto, 
            serial 
        } = body;

        // 1. Obtener el hallazgo y el activo relacionado
        const hallazgo = await db.Hallazgo.findByPk(id, {
            include: [{ 
                model: db.Inspeccion, 
                as: 'inspeccion',
                include: [{ model: db.Activo, as: 'activo' }] 
            }],
            transaction: t
        });

        const activo = hallazgo.inspeccion.activo;
        
        // Determinar qué plantilla de vehículo usa (Mack, Kenworth, etc)
        const vehiculoId = activo.vehiculoInstanciaId ? 
            (await db.VehiculoInstancia.findByPk(activo.vehiculoInstanciaId)).vehiculoId : null;

        // 2. MAGIA ORGÁNICA: Buscar o Crear Subsistema Plantilla
        const [subPlantilla] = await db.Subsistema.findOrCreate({
            where: { nombre: subsistemaNombre, vehiculoId: vehiculoId },
            defaults: { categoria: 'motor' }, // Deberías pasar la categoría desde el front
            transaction: t
        });

        // 3. Crear la Instancia en el camión si no la tiene
        const [subInstancia] = await db.SubsistemaInstancia.findOrCreate({
            where: { activoId: activo.id, subsistemaId: subPlantilla.id },
            defaults: { nombre: subsistemaNombre },
            transaction: t
        });

        // 4. Crear el "Slot" sugerido si es una pieza nueva
        const [rec] = await db.ConsumibleRecomendado.findOrCreate({
            where: { subsistemaId: subPlantilla.id, valorCriterio: consumibleNombre },
            defaults: { cantidad: cantidadSlots || 1, categoria: 'repuesto' },
            transaction: t
        });

        // 5. Vincular el hallazgo a la anatomía real
        await hallazgo.update({
            subsistemaInstanciaId: subInstancia.id,
            impacto: impacto || hallazgo.impacto,
            // Aquí podrías vincular a un ConsumibleInstalado específico si ya existe
        }, { transaction: t });

        await t.commit();
        return NextResponse.json({ success: true, message: "Falla caracterizada y anatomía creada" });

    } catch (error) {
        if (t) await t.rollback();
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}