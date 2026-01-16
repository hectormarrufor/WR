// api/gestionMantenimiento/ordenes/[id]/cerrar/route.js
export async function PUT(request, { params }) {
    const t = await sequelize.transaction();
    try {
        // ... validaciones
        const { id } = params;
        const body = await request.json();
        // { informeFinal, usuarioId }
        const orden = await OrdenMantenimiento.findByPk(id, { transaction: t });
        if (!orden) {
            throw new Error('Orden de Mantenimiento no encontrada');
        }

        // 1. Cerrar Orden
        await orden.update({ 
            estado: 'Finalizada', 
            fechaCierre: new Date(),
            diagnosticoTecnico: body.informeFinal
        }, { transaction: t });

        // 2. Cerrar Hallazgos
        await Hallazgo.update(
            { estado: 'Cerrado' },
            { where: { ordenMantenimientoId: id }, transaction: t }
        );

        // 3. IMPORTANTISIMO: Restaurar Activo a Operativo
        // OJO: Verificar si el activo tiene OTRAS ordenes abiertas críticas antes de ponerlo Operativo.

        // Por simplicidad asumimos que si cierras esta, el activo queda OK.
        await Activo.update({ estado: 'Operativo' }, { where: { id: orden.activoId }, transaction: t });

        // 4. Registrar Instalación Física en el Historial del Activo
        // Aquí es donde mueves el consumible de "Requerimiento" a "ConsumibleInstalado" (tabla que ya tenemos)
        // para que aparezca en la hoja de vida que hicimos antes.
        
        // ... lógica para crear ConsumibleInstalado ...

        await t.commit();
        // ...
    } catch (e) {
       // ...
    }
}