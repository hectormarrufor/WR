import db from '@/models';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { hallazgoIds, activoId, responsableId, tareas, ...ordenData } = body;

        if (!activoId || !tareas || tareas.length === 0) {
            throw new Error('Se requiere un activo y al menos una tarea para crear la orden.');
        }

        // 1. Crear la Orden de Mantenimiento principal
        const nuevaOM = await db.Mantenimiento.create({
            ...ordenData,
            activoId,
            responsableId,
            estado: 'Planificado',
        }, { transaction });

        // 2. Vincular los hallazgos a la nueva OM y marcarlos como "Asignados"
        if (hallazgoIds && hallazgoIds.length > 0) {
            await db.Hallazgo.update(
                { ordenMantenimientoId: nuevaOM.id, estado: 'Asignado' },
                { where: { id: hallazgoIds }, transaction }
            );
        }

        // 3. Crear las Tareas de Mantenimiento
        const tareasParaCrear = tareas.map(t => ({
            ...t,
            mantenimientoId: nuevaOM.id,
        }));
        const tareasCreadas = await db.TareaMantenimiento.bulkCreate(tareasParaCrear, { transaction, returning: true });

        // 4. Crear la Requisición de Materiales si alguna tarea los necesita
        const consumiblesRequeridos = tareas.flatMap(
            (tarea, index) => (tarea.consumibles || []).map(cons => ({
                tareaMantenimientoId: tareasCreadas[index].id, // Enlazar al ID de la tarea recién creada
                consumibleId: cons.consumibleId,
                cantidadSolicitada: cons.cantidad,
            }))
        ).filter(c => c.consumibleId && c.cantidadSolicitada > 0);

        if (consumiblesRequeridos.length > 0) {
            // a. Crear la cabecera de la requisición
            const nuevaRequisicion = await db.Requisicion.create({
                ordenMantenimientoId: nuevaOM.id,
                solicitadoPorId: body.userId, // Asumimos que el userId viene en el body
                estado: 'Pendiente',
            }, { transaction });

            // b. Crear los detalles de la requisición
            const detallesParaCrear = consumiblesRequeridos.map(cons => ({
                ...cons,
                requisicionId: nuevaRequisicion.id,
            }));
            await db.RequisicionDetalle.bulkCreate(detallesParaCrear, { transaction });
        }

        await transaction.commit();
        return NextResponse.json(nuevaOM, { status: 201 });

    } catch (error) {
        await transaction.rollback();
        console.error("Error al crear la Orden de Mantenimiento:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}