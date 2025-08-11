// Dentro de la API para completar una tarea
export async function POST(request, { params }) {
    const transaction = await db.sequelize.transaction();
    try {
        const tareaId = params.id;
        const body = await request.json(); // Body puede contener el kilometraje actual
        const { kilometrajeAlCompletar, horometroAlCompletar } = body;

        // 1. Encontrar la tarea y el activo asociado
        const tarea = await db.TareaMantenimiento.findByPk(tareaId, {
            include: [{ model: db.Mantenimiento, as: 'ordenMantenimiento' }]
        });
        const activo = await db.Activo.findByPk(tarea.ordenMantenimiento.activoId, { transaction });
        let datosActivo = activo.datosPersonalizados;

        // 2. Encontrar qué consumibles se usaron en esta tarea
        const salidas = await db.SalidaInventario.findAll({ where: { tareaMantenimientoId: tareaId } });

        // 3. Actualizar el JSONB del activo
        for (const salida of salidas) {
            // Buscamos el atributo del activo que corresponde a este tipo de consumible
            // (Esta lógica de mapeo es la más compleja y depende de tu estructura)
            const atributoId = findAttributeIdForConsumible(datosActivo, salida.consumibleId);

            if (atributoId) {
                // Actualizamos el objeto para ese atributo
                datosActivo[atributoId] = {
                    consumibleId: salida.consumibleId,
                    fechaInstalacion: new Date(),
                    kmInstalacion: kilometrajeAlCompletar,
                    horometroInstalacion: horometroAlCompletar
                };
            }
        }

        // 4. Guardamos los cambios en el activo
        await activo.update({ datosPersonalizados: datosActivo }, { transaction });

        // 5. Marcamos la tarea como completada
        await tarea.update({ estado: 'Completada' }, { transaction });

        await transaction.commit();
        return NextResponse.json({ message: 'Tarea completada y estado del activo actualizado.' });
    } catch (error) {
        // ...
    }
}