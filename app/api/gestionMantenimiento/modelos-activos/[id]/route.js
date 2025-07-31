import db from '@/models';
import { NextResponse } from 'next/server';

/**
 * Función recursiva para buscar y anidar los detalles completos de los modelos componentes.
 * @param {object} especificaciones - El objeto de especificaciones del modelo padre.
 * @param {Set} visited - Un Set para rastrear los IDs de modelos visitados y evitar bucles infinitos.
 * @returns {Promise<object>} - El objeto de especificaciones con los componentes poblados.
 */
async function poblarComponentesRecursivo(especificaciones, visited = new Set()) {
    // Hacemos una copia para no modificar el objeto original en el ciclo.
    const especificacionesPobladas = JSON.parse(JSON.stringify(especificaciones));

    for (const attrId in especificacionesPobladas) {
        const atributo = especificacionesPobladas[attrId];

        // Caso 1: Si el atributo es un objeto anidado, procesamos su definición recursivamente.
        if (atributo.dataType === 'object' && atributo.definicion) {
            // Convertimos la definición (que puede ser array o objeto) a un objeto para procesarla.
            const definicionObjeto = Array.isArray(atributo.definicion)
                ? atributo.definicion.reduce((acc, item) => ({ ...acc, [item.id]: item }), {})
                : atributo.definicion;

            atributo.definicion = await poblarComponentesRecursivo(definicionObjeto, visited);
        }

        // Caso 2: Si el atributo es una referencia a otro MODELO (un componente).
        if (atributo.dataType === 'grupo' && atributo.refId) {
            
            // Medida de seguridad para evitar que una referencia circular congele la API.
            if (visited.has(atributo.refId)) {
                atributo.componente = { error: 'Referencia circular detectada', id: atributo.refId };
                continue; // Saltamos al siguiente atributo.
            }
            visited.add(atributo.refId);

            // Buscamos el modelo componente en la base de datos.
            const componente = await db.Modelo.findByPk(atributo.refId, {
                include: [{ model: db.Categoria, as: 'categoria', attributes: ['id', 'nombre'] }]
            });

            if (componente) {
                // Si encontramos el componente, poblamos SUS especificaciones recursivamente.
                const especificacionesComponentePobladas = await poblarComponentesRecursivo(componente.especificaciones, new Set(visited));
                
                // ✨ Anidamos el objeto completo del componente dentro del atributo.
                atributo.componente = {
                    ...componente.toJSON(),
                    especificaciones: especificacionesComponentePobladas
                };
            }
        }
    }
    return especificacionesPobladas;
}
// --- Función Helper para PUT (similar a la de creación) ---
async function actualizarModeloRecursivo(modeloId, modeloData, transaction) {
    const { nombre, categoriaId, especificaciones } = modeloData;

    const modeloAActualizar = await db.Modelo.findByPk(modeloId, { transaction });
    if (!modeloAActualizar) {
        throw new Error(`Modelo con ID ${modeloId} no encontrado para actualizar.`);
    }

    const especificacionesParaGuardar = Array.isArray(especificaciones)
        ? especificaciones.reduce((acc, attr) => {
            const { key, ...rest } = attr;
            acc[rest.id] = rest;
            return acc;
        }, {})
        : especificaciones;

    // Iteramos para encontrar y actualizar/crear los modelos componentes.
    for (const attrId in especificacionesParaGuardar) {
        const atributo = especificacionesParaGuardar[attrId];
        if (atributo.dataType === 'grupo' && atributo.subGrupo) {
            const componenteCategoriaId = atributo.refId;
            let componenteIdAActualizar = null;
            
            // Verificamos si el componente ya existe en las especificaciones originales.
            if (modeloAActualizar.especificaciones[attrId] && modeloAActualizar.especificaciones[attrId].refId) {
                componenteIdAActualizar = modeloAActualizar.especificaciones[attrId].refId;
            }

            let componenteActualizado;
            if (componenteIdAActualizar) {
                 // Si ya existe, lo actualizamos recursivamente.
                componenteActualizado = await actualizarModeloRecursivo(componenteIdAActualizar, {
                    nombre: atributo.subGrupo.nombre,
                    categoriaId: componenteCategoriaId,
                    especificaciones: atributo.subGrupo.definicion,
                }, transaction);
            } else {
                // Si no existe, lo creamos (esto permite añadir nuevos componentes al editar).
                // Nota: reutilizar `crearModeloRecursivo` de la ruta POST sería ideal aquí.
                // Por simplicidad, asumimos que el PUT solo modifica existentes.
                // Para crear, se necesitaría una lógica de creación aquí.
                 componenteActualizado = await db.Modelo.create({
                    nombre: atributo.subGrupo.nombre,
                    categoriaId: componenteCategoriaId,
                    especificaciones: atributo.subGrupo.definicion.reduce((acc, attr) => ({...acc, [attr.id]: attr}),{}),
                 }, { transaction });
            }
            
            especificacionesParaGuardar[attrId].refId = componenteActualizado.id;
            delete especificacionesParaGuardar[attrId].subGrupo;
        }
    }

    await modeloAActualizar.update({
        nombre,
        categoriaId,
        especificaciones: especificacionesParaGuardar,
    }, { transaction });

    return modeloAActualizar;
}


// =============================================
// --- ENDPOINTS DE LA API ---
// =============================================

export async function GET(request, { params }) {
    const { id } = await params;

    try {
        const modelo = await db.Modelo.findByPk(id, {
            include: [{
                model: db.Categoria,
                as: 'categoria',
            }]
        });

        if (!modelo) {
            return NextResponse.json({ message: 'Modelo no encontrado' }, { status: 404 });
        }

        // Inicia el proceso de poblado recursivo desde las especificaciones del modelo principal.
        const especificacionesPobladas = await poblarComponentesRecursivo(modelo.especificaciones);

        // Preparamos la respuesta final con el modelo y sus especificaciones ya pobladas.
        const resultadoFinal = {
            ...modelo.toJSON(),
            especificaciones: especificacionesPobladas,
        };

        return NextResponse.json(resultadoFinal);

    } catch (error) {
        console.error(`Error al obtener el modelo ${id}:`, error);
        return NextResponse.json({
            message: 'Error al obtener el modelo',
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

/**
 * PUT para actualizar un modelo y su jerarquía.
 */
export async function PUT(request, { params }) {
    const { id } = await params;
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        
        // Llamamos a la función recursiva de actualización.
        const modeloActualizado = await actualizarModeloRecursivo(id, body, transaction);
        
        await transaction.commit();
        return NextResponse.json(modeloActualizado);

    } catch (error) {
        await transaction.rollback();
        console.error(`Error al actualizar el modelo ${id}:`, error);
        return NextResponse.json({
            message: 'Error al actualizar el modelo',
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}


/**
 * DELETE para eliminar un modelo de forma segura.
 */
export async function DELETE(request, { params }) {
    const { id } = await params;
    const transaction = await db.sequelize.transaction();
    try {
        const modeloAEliminar = await db.Modelo.findByPk(id, { transaction });
        if (!modeloAEliminar) {
            await transaction.rollback();
            return NextResponse.json({ message: 'Modelo no encontrado' }, { status: 404 });
        }

        // 1. Verificación de dependencia: ¿Hay algún Activo usando este modelo?
        // Esta es la comprobación clave gracias a la relación que confirmaste.
        const activosDependientes = await db.Activo.count({
            where: { modeloId: id },
            transaction
        });

        if (activosDependientes > 0) {
            await transaction.rollback();
            return NextResponse.json({
                message: `No se puede eliminar. El modelo está siendo utilizado por ${activosDependientes} activo(s).`
            }, { status: 409 }); // 409 Conflict
        }
        
        // 2. Opcional: Lógica para eliminar o desasociar componentes.
        // Por ahora, el comportamiento seguro es solo borrar el modelo principal.
        // Si quisieras borrar en cascada, la lógica iría aquí, pero es más complejo y riesgoso.

        // 3. Eliminar el modelo.
        await modeloAEliminar.destroy({ transaction });

        await transaction.commit();
        
        // 204 No Content: La operación fue exitosa y no hay nada que devolver.
        return new Response(null, { status: 204 });

    } catch (error) {
        await transaction.rollback();
        console.error(`Error al eliminar el modelo ${id}:`, error);
        return NextResponse.json({
            message: 'Error al eliminar el modelo',
            error: error.message
        }, { status: 500 });
    }
}