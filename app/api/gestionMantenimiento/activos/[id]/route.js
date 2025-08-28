import db from '@/models';
import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';

// Reutilizamos la función helper que creamos para poblar la jerarquía de modelos.
// Puedes mover esta función a un archivo de 'utils' para no repetirla.
async function poblarComponentesRecursivo(especificaciones, visited = new Set()) {
    const especificacionesPobladas = JSON.parse(JSON.stringify(especificaciones));
    for (const attrId in especificacionesPobladas) {
        const atributo = especificacionesPobladas[attrId];
        if (atributo.dataType === 'object' && atributo.definicion) {
            const defObjeto = Array.isArray(atributo.definicion) ? atributo.definicion.reduce((acc, item) => ({ ...acc, [item.id]: item }), {}) : atributo.definicion;
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
    const { id } = await params;
    try {
        const activo = await db.Activo.findByPk(id, {
            include: [{
                model: db.Modelo,
                as: 'modelo',
            },

            {
                model: db.Kilometraje,
                as: 'kilometrajes',
                attributes: ['id', 'fecha_registro', 'valor'],
                order: [['fecha_registro', 'DESC']],
                limit: 1 // Solo queremos el último registro de kilometraje
            },
            {
                model: db.Horometro,
                as: 'horometros',
                attributes: ['id', 'fecha_registro', 'valor'],
                order: [['fecha_registro', 'DESC']],
                limit: 1 // Solo queremos el último registro de horómetro
            },
            {
                model: db.Hallazgo,
                as: 'hallazgos',
                // Solo queremos los hallazgos que aún no se han resuelto.
                where: { estado: 'Pendiente' },
                required: false, // Importante: si no hay hallazgos pendientes, el activo se debe mostrar igual.
                include: [{ model: db.Inspeccion, as: 'inspeccion' }] // Traemos la inspección asociada al hallazgo
            }
            ]
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

export async function PUT(request, { params }) {
    const { id } = await params;
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        // console.log(body);

        // return NextResponse.json({ message: 'Datos incompletos para actualizar el activo.' }, { status: 400 });

        // 1. Buscamos el activo existente para obtener la URL de la imagen antigua.
        const activoExistente = await db.Activo.findByPk(id, { transaction });
        if (!activoExistente) {
            await transaction.rollback();
            return NextResponse.json({ message: 'Activo no encontrado' }, { status: 404 });
        }

        const urlImagenAntigua = activoExistente.imagen;

        // 2. Actualizamos el registro del activo en la base de datos.
        await activoExistente.update(body, { transaction });

        // 3. ✨ LÓGICA DE REEMPLAZO ✨
        // Comprobamos si la URL de la imagen ha cambiado Y si existía una imagen antigua.
        const urlImagenNueva = body.imagen;
        if (urlImagenNueva !== urlImagenAntigua && urlImagenAntigua) {
            // Si son diferentes, eliminamos la imagen antigua de Vercel Blob.
            await del(urlImagenAntigua);
        }

        await transaction.commit();
        console.log(`\x1b[32m [SUCCESS]: Activo ${id} actualizado correctamente. \x1b[0m`);
        return NextResponse.json({ message: 'Activo actualizado correctamente.' }, { status: 200 });

    } catch (error) {
        await transaction.rollback();
        console.log(`\x1b[41m [ERROR]: Error al actualizar activo: ${error.message} \x1b[0m`);
        return NextResponse.json({ message: 'Error al actualizar el activo', error: error.message }, { status: 500 });

    }
}



export async function DELETE(request, { params }) {
    const { id } = await params;
    const transaction = await db.sequelize.transaction();
    try {
        await db.Kilometraje.destroy({
            where: { activoId: id },
            transaction
        });

        await db.Horometro.destroy({
            where: { activoId: id },
            transaction
        });
        await db.Hallazgo.destroy({
            where: { activoId: id },
            transaction
        });
        
        const activoAEliminar = await db.Activo.findByPk(id, { transaction });
        if (!activoAEliminar) {
            await transaction.rollback();
            return NextResponse.json({ message: 'Activo no encontrado' }, { status: 404 });
        }

        const urlImagenAEliminar = activoAEliminar.imagen;

        // 1. Eliminamos el registro del activo de la base de datos.
        await activoAEliminar.destroy({ transaction });

        // 2. ✨ LÓGICA DE ELIMINACIÓN DE BLOB ✨
        // Si el activo tenía una URL de imagen...
        if (urlImagenAEliminar) {
            // ...la eliminamos de Vercel Blob.
            // Esto se hace después de confirmar la transacción de la BD.
            await del(urlImagenAEliminar);
        }

        await transaction.commit();
        console.log(`\x1b[32m [SUCCESS]: Activo ${id} eliminado correctamente. \x1b[0m`);
        return NextResponse.json({ message: 'Activo eliminado correctamente.' }, { status: 200 });

    } catch (error) {
        await transaction.rollback();
        console.log(`\x1b[41m [ERROR]: Error al eliminar el activo: ${error.message} \x1b[0m`);
        return NextResponse.json({ message: 'Error al eliminar el activo', error: error.message }, { status: 500 });

    }
}