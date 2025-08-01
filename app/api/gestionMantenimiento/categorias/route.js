// app/api/gestionMantenimiento/categorias/route.js
import db from '@/models';
import { NextResponse } from 'next/server';

/**
 * Función recursiva para crear una categoría y sus subcategorías.
 * @param {object} categoriaData - Los datos de la categoría a crear (nombre, definicion).
 * @param {number|null} parentId - El ID de la categoría padre.
 * @param {number|null} grupoBaseIdParaAsociar - El ID del grupo base específico para ESTA categoría.
 * @param {import('sequelize').Transaction} transaction - La transacción de Sequelize.
 * @returns {Promise<object>} - La instancia de la categoría creada.
 */
async function crearCategoriaRecursiva(categoriaData, parentId, grupoBaseIdParaAsociar, transaction) {
    const { nombre, definicion } = categoriaData;

    const definicionParaGuardar = definicion.reduce((acc, attr) => {
        const { key, ...rest } = attr;
        acc[rest.id] = rest;
        return acc;
    }, {});

    // 1. Crear la categoría actual.
    const nuevaCategoria = await db.Categoria.create({
        nombre: nombre,
        definicion: definicionParaGuardar,
        parentId: parentId,
    }, { transaction });

    // 2. ✨ ¡NUEVA LÓGICA! Asociar el grupo base si se proporcionó un ID.
    // Esto se ejecutará para las subcategorías.
    if (grupoBaseIdParaAsociar) {
        await nuevaCategoria.addGruposBase([grupoBaseIdParaAsociar], { transaction });
    }

    // 3. Iterar para encontrar y crear sub-categorías.
    for (const attrId in definicionParaGuardar) {
        const atributo = definicionParaGuardar[attrId];

        if (atributo.dataType === 'grupo' && atributo.subGrupo) {
            
            // Construimos el nombre, por ej: "MOTOR_VEHICULO_CAMIONETA"
            const subCategoriaNombre = `${atributo.subGrupo.nombre}_${nombre}`;

            // ✨ ¡AQUÍ ESTÁ LA CLAVE! El 'refId' del atributo es el ID del grupo base
            // que corresponde a esta subcategoría.
            const subCategoriaGrupoBaseId = atributo.refId;

            // Llamada recursiva, pasando el ID del grupo base correspondiente.
            const subCategoriaCreada = await crearCategoriaRecursiva({
                nombre: subCategoriaNombre,
                definicion: atributo.subGrupo.definicion,
            }, nuevaCategoria.id, subCategoriaGrupoBaseId, transaction);
            
            // Actualizamos el refId en la definición del padre con el ID de la subcategoría creada.
            definicionParaGuardar[attrId].refId = subCategoriaCreada.id;
            
            delete definicionParaGuardar[attrId].subGrupo;
            delete definicionParaGuardar[attrId].mode;
        }
    }

    // 4. Actualización final de la definición de la categoría actual.
    await nuevaCategoria.update({ definicion: definicionParaGuardar }, { transaction });

    return nuevaCategoria;
}

// POST para crear una nueva categoría y su jerarquía
export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { nombre, definicion, gruposBaseIds } = body;

        if (!nombre || !gruposBaseIds || !gruposBaseIds.length) {
            return NextResponse.json({ message: 'Nombre y al menos un grupo base son requeridos.' }, { status: 400 });
        }

        // Inicia la creación para la categoría principal. Su ID de grupo base es null aquí,
        // porque se asocia con un array de grupos justo después.
        const categoriaPrincipal = await crearCategoriaRecursiva({ nombre, definicion }, null, null, transaction);

        // Asocia los grupos base (puede ser más de uno) a la categoría PRINCIPAL.
        await categoriaPrincipal.addGruposBase(gruposBaseIds, { transaction });

        await transaction.commit();

        const result = await db.Categoria.findByPk(categoriaPrincipal.id, {
            include: [
                { model: db.Grupo, as: 'gruposBase' },
                { 
                    model: db.Categoria, 
                    as: 'subCategorias',
                    include: [{ model: db.Grupo, as: 'gruposBase' }] // Incluir también los grupos de las hijas
                }
            ]
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al crear la categoría:', error);
        return NextResponse.json({
            message: 'Error al crear la categoría',
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

// GET para obtener todas las categorías (tu código existente, ya está bien)
export async function GET(request) {
    try {
        const categorias = await db.Categoria.findAll({
            include: [
                { model: db.Grupo, as: 'gruposBase' },
                {
                    model: db.Categoria,
                    as: 'subCategorias',
                    attributes: ['id', 'nombre'],
                }
            ]
        });
        return NextResponse.json(categorias);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return NextResponse.json({ message: 'Error al obtener categorías', error: error.message }, { status: 500 });
    }
}