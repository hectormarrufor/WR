// api/gestionMantenimiento/inspecciones/route.js
export async function POST(request) {
    const t = await sequelize.transaction();
    try {
        const body = await request.json(); // { activoId, usuarioId, km, horometro, hallazgos: [{desc, impacto, subId}] }
        
        // 1. Registrar Historiales (KM y Horómetro)
        // Esto es vital para saber cuándo ocurrió el fallo
        if (body.km) {
            await Kilometraje.create({ 
                activoId: body.activoId, valor: body.km, 
                fecha: new Date(), origen: 'Inspeccion', usuarioId: body.usuarioId 
            }, { transaction: t });
        }
        // ... (Igual para Horómetro)
        if (body.horometro) {
            await Horometro.create({ 
                activoId: body.activoId, valor: body.horometro, 
                fecha: new Date(), origen: 'Inspeccion', usuarioId: body.usuarioId 
            }, { transaction: t });
        }

        // 2. Crear Inspección Cabecera
        const inspeccion = await Inspeccion.create({
            activoId: body.activoId,
            usuarioId: body.usuarioId,
            kilometrajeRegistrado: body.km,
            horometroRegistrado: body.horometro,
            observacionGeneral: body.observacion
        }, { transaction: t });

        // 3. Crear Hallazgos
        let peorEstado = 'Operativo'; // Estado base
        
        for (const h of body.hallazgos) {
            await Hallazgo.create({
                inspeccionId: inspeccion.id,
                subsistemaInstanciaId: h.subsistemaInstanciaId,
                descripcion: h.descripcion,
                impacto: h.impacto, // 'Advertencia', 'No Operativo', etc.
                estado: 'Pendiente'
            }, { transaction: t });

            // Lógica del "Mata Estados"
            if (h.impacto === 'No Operativo') {
                peorEstado = 'No Operativo';
            } else if (h.impacto === 'Advertencia' && peorEstado !== 'No Operativo') {
                peorEstado = 'Operativo con Advertencia';
            }
        }

        // 4. Actualizar Estado del Activo (Consecuencia inmediata)
        await Activo.update({ estado: peorEstado }, { where: { id: body.activoId }, transaction: t });

        await t.commit();
        return NextResponse.json({ success: true, nuevoEstado: peorEstado });
    } catch (e) {
        await t.rollback();
        console.error('Error al registrar inspección:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}