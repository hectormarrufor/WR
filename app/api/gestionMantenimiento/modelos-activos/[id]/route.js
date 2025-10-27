// app/api/gestionMantenimiento/modelos/[id]/route.js
import db from '@/models';
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { propagateFrom } from '../../helpers/propagate';


/**
 * Función recursiva para procesar la definición de un modelo y crear/actualizar los sub-modelos anidados.
 * @param {object} especificaciones - El objeto de especificaciones del modelo.
 * @param {number} categoriaId - El ID de la categoría del modelo.
 * @param {object} transaction - La transacción de Sequelize.
 * @returns {Promise<object>} - El objeto de especificaciones procesado para guardar en DB.
 */
async function procesarDefinicionParaGuardar(especificaciones, categoriaId, transaction) {
    const especificacionesProcesadas = {};

    for (const key in especificaciones) {
        if (Object.prototype.hasOwnProperty.call(especificaciones, key)) {
            const atributo = { ...especificaciones[key] };

            if (atributo.dataType === 'grupo' && atributo.mode === 'define' && atributo.subGrupo) {
                const nombreSubModelo = atributo.subGrupo.nombre;
                let subModelo = await db.Modelo.findOne({
                    where: { nombre: nombreSubModelo },
                    transaction
                });

                if (!subModelo) {
                    const subEspecificacionesProcesadas = await procesarDefinicionParaGuardar(atributo.subGrupo.definicion, categoriaId, transaction);
                    subModelo = await db.Modelo.create({
                        nombre: nombreSubModelo,
                        categoriaId,
                        especificaciones: subEspecificacionesProcesadas,
                    }, { transaction });
                } else {
                    const subEspecificacionesProcesadas = await procesarDefinicionParaGuardar(atributo.subGrupo.definicion, categoriaId, transaction);
                    await subModelo.update({
                        especificaciones: subEspecificacionesProcesadas,
                    }, { transaction });
                }

                atributo.refId = subModelo.id;
                atributo.mode = 'select';
                delete atributo.subGrupo;
            }

            if (atributo.dataType === 'object' && atributo.definicion) {
                atributo.definicion = await procesarDefinicionParaGuardar(atributo.definicion, categoriaId, transaction);
            }
            
            delete atributo.key;
            especificacionesProcesadas[key] = atributo;
        }
    }
    return especificacionesProcesadas;
}
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


export async function PUT(request, { params }) {
  const { id } = params;
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { nombre, categoriaId, definicion } = body;

    const modeloExistente = await db.Modelo.findByPk(id, { transaction });
    if (!modeloExistente) {
      await transaction.rollback();
      throw new Error(`Modelo con ID ${id} no encontrado.`);
    }

    const especificacionesProcesadas = await procesarDefinicionParaGuardar(definicion, categoriaId, transaction);

    await modeloExistente.update(
      { nombre, categoriaId, especificaciones: especificacionesProcesadas },
      { transaction }
    );

    await transaction.commit();

    // Propagar cambios desde el modelo hacia sus activos (no revertir si falla)
    try {
      await propagateFrom('modelo', id, { removeMissing: false, sequelizeOverride: db.sequelize });
    } catch (propErr) {
      console.error('Error propagando cambios desde modelo:', propErr);
    }

    return NextResponse.json({ message: 'Modelo actualizado exitosamente.' });
  } catch (error) {
    await transaction.rollback();
    console.error(`Error al actualizar el modelo ${id}:`, error);
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}



export async function GET(request, { params }) {
    const { id } = await params;
    try {
        const modelo = await db.Modelo.findByPk(id, {
            include: [{
                model: db.Categoria,
                as: 'categoria',
                attributes: ['id', 'nombre', 'acronimo']
            }]
        });

        if (!modelo) {
            return NextResponse.json({ message: 'Modelo no encontrado' }, { status: 404 });
        }
        
        const especificacionesPobladas = await poblarComponentesRecursivo(modelo.especificaciones);
        const resultadoFinal = {
            ...modelo.toJSON(),
            especificaciones: especificacionesPobladas,
        };

        return NextResponse.json(resultadoFinal);
    } catch (error) {
        console.error(`Error al obtener el modelo ${id}:`, error);
        return NextResponse.json({ message: 'Error en el servidor' }, { status: 500 });
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