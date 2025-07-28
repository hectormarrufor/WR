import db from '@/models';
import { NextResponse } from 'next/server';

// Reutilizamos la función helper que creamos para poblar la jerarquía de modelos.
// Puedes mover esta función a un archivo de 'utils' para no repetirla.
async function poblarComponentesRecursivo(especificaciones, visited = new Set()) {
    const especificacionesPobladas = JSON.parse(JSON.stringify(especificaciones));
    for (const attrId in especificacionesPobladas) {
        const atributo = especificacionesPobladas[attrId];
        if (atributo.dataType === 'object' && atributo.definicion) {
            const defObjeto = Array.isArray(atributo.definicion) ? atributo.definicion.reduce((acc, item) => ({...acc, [item.id]: item}), {}) : atributo.definicion;
            atributo.definicion = await poblarComponentesRecursivo(defObjeto, visited);
        }
        if (atributo.dataType === 'grupo' && atributo.refId) {
            if (visited.has(atributo.refId)) {
                atributo.componente = { error: 'Referencia circular detectada', id: atributo.refId };
                continue;
            }
            visited.add(atributo.refId);
            const componente = await db.Modelo.findByPk(atributo.refId, {
                include: [{ model: db.Categoria, as: 'categoria', attributes: ['id', 'nombre'] }]
            });
            if (componente) {
                const especificacionesComponentePobladas = await poblarComponentesRecursivo(componente.especificaciones, new Set(visited));
                atributo.componente = { ...componente.toJSON(), especificaciones: especificacionesComponentePobladas };
            }
        }
    }
    return especificacionesPobladas;
}


/**
 * GET para obtener un activo específico y la estructura completa de su modelo.
 */
export async function GET(request, { params }) {
    const { id } = params;
    try {
        const activo = await db.Activo.findByPk(id, {
            include: [{
                model: db.Modelo,
                as: 'modelo',
            }]
        });

        if (!activo) {
            return NextResponse.json({ message: 'Activo no encontrado' }, { status: 404 });
        }

        // Una vez que tenemos el activo y su modelo base, poblamos la jerarquía del modelo.
        const especificacionesPobladas = await poblarComponentesRecursivo(activo.modelo.especificaciones);

        const resultadoFinal = {
            ...activo.toJSON(),
            modelo: {
                ...activo.modelo.toJSON(),
                especificaciones: especificacionesPobladas,
            }
        };

        return NextResponse.json(resultadoFinal);
    } catch (error) {
        console.error(`Error al obtener el activo ${id}:`, error);
        return NextResponse.json({ message: 'Error al obtener el activo', error: error.message }, { status: 500 });
    }
}

/**
 * PUT para actualizar un activo.
 */
export async function PUT(request, { params }) {
    const { id } = params;
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const activoAActualizar = await db.Activo.findByPk(id, { transaction });

        if (!activoAActualizar) {
            await transaction.rollback();
            return NextResponse.json({ message: 'Activo no encontrado' }, { status: 404 });
        }

        // Actualizamos el activo con los nuevos datos
        await activoAActualizar.update(body, { transaction });
        
        await transaction.commit();
        return NextResponse.json(activoAActualizar);

    } catch (error) {
        await transaction.rollback();
        console.error(`Error al actualizar el activo ${id}:`, error);
        if (error.name === 'SequelizeUniqueConstraintError') {
             return NextResponse.json({ message: 'El código de activo ya existe.' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Error al actualizar el activo', error: error.message }, { status: 500 });
    }
}


/**
 * DELETE para eliminar un activo.
 */
export async function DELETE(request, { params }) {
    const { id } = params;
    const transaction = await db.sequelize.transaction();
    try {
        const activoAEliminar = await db.Activo.findByPk(id, { transaction });
        if (!activoAEliminar) {
            await transaction.rollback();
            return NextResponse.json({ message: 'Activo no encontrado' }, { status: 404 });
        }

        // Aquí irían futuras comprobaciones de dependencias (si el activo está en una inspección, etc.)
        // Por ahora, la eliminación es directa.
        
        await activoAEliminar.destroy({ transaction });
        await transaction.commit();
        
        return new Response(null, { status: 204 }); // Éxito, sin contenido

    } catch (error) {
        await transaction.rollback();
        console.error(`Error al eliminar el activo ${id}:`, error);
        return NextResponse.json({ message: 'Error al eliminar el activo', error: error.message }, { status: 500 });
    }
}