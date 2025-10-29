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
const generarAcronimo = (nombre) => {
    if (!nombre) return '';
    // Elimina palabras comunes, toma las primeras 3 letras, y las pone en mayúsculas.
    const palabras = nombre.replace(/de|la|el/gi, '').trim().split(' ');
    if (palabras.length >= 3) {
        return (palabras[0][0] + palabras[1][0] + palabras[2][0]).toUpperCase();
    }
    return nombre.substring(0, 3).toUpperCase();
};
// async function crearCategoriaRecursiva(categoriaData, parentId, grupoBaseIdParaAsociar, transaction) {
//     const { nombre, definicion, acronimo } = categoriaData;

//     const definicionParaGuardar = definicion.reduce((acc, attr) => {
//         const { key, ...rest } = attr;
//         acc[rest.id] = rest;
//         return acc;
//     }, {});

//     // 1. Crear la categoría actual.
//     const nuevaCategoria = await db.Categoria.create({
//         nombre: nombre,
//         definicion: definicionParaGuardar,
//         parentId: parentId,
//         acronimo: acronimo,
//     }, { transaction });

//     // 2. ✨ ¡NUEVA LÓGICA! Asociar el grupo base si se proporcionó un ID.
//     // Esto se ejecutará para las subcategorías.
//     if (grupoBaseIdParaAsociar) {
//         await nuevaCategoria.addGruposBase([grupoBaseIdParaAsociar], { transaction });
//     }

//     // 3. Iterar para encontrar y crear sub-categorías.
//     for (const attrId in definicionParaGuardar) {
//         const atributo = definicionParaGuardar[attrId];

//         if (atributo.dataType === 'grupo' && atributo.subGrupo) {
            
//             // Construimos el nombre, por ej: "MOTOR_VEHICULO_CAMIONETA"
//             const subCategoriaNombre = `${atributo.subGrupo.nombre}_${nombre}`;
//             const subCategoriaAcronimo = generarAcronimo(subCategoriaNombre);

//             // ✨ ¡AQUÍ ESTÁ LA CLAVE! El 'refId' del atributo es el ID del grupo base
//             // que corresponde a esta subcategoría.
//             const subCategoriaGrupoBaseId = atributo.refId;

//             // Llamada recursiva, pasando el ID del grupo base correspondiente.
//             const subCategoriaCreada = await crearCategoriaRecursiva({
//                 nombre: subCategoriaNombre,
//                 definicion: atributo.subGrupo.definicion,
//                 acronimo: subCategoriaAcronimo,
//             }, nuevaCategoria.id, subCategoriaGrupoBaseId, transaction);
            
//             // Actualizamos el refId en la definición del padre con el ID de la subcategoría creada.
//             definicionParaGuardar[attrId].refId = subCategoriaCreada.id;
            
//             delete definicionParaGuardar[attrId].subGrupo;
//             delete definicionParaGuardar[attrId].mode;
//         }
//     }

//     // 4. Actualización final de la definición de la categoría actual.
//     await nuevaCategoria.update({ definicion: definicionParaGuardar }, { transaction });

//     return nuevaCategoria;
// }

// POST para crear una nueva categoría y su jerarquía
export async function POST(request) {
  const transaction = await sequelize.transaction();
  try {
    const body = await request.json();
    const {
      nombre,
      definicion = {},
      gruposBaseIds = [], // array de ids de Grupos que esta categoria asocia
      subCategorias = []  // estructura recursiva similar a subGrupos en grupos
    } = body;

    if (!nombre) {
      await transaction.rollback();
      return NextResponse.json({ message: 'El nombre es requerido.' }, { status: 400 });
    }

    const acronimo = generarAcronimo(nombre);

    // crear la categoría raíz
    const categoria = await db.Categoria.create({
      nombre,
      acronimo,
      definicion: definicion || {}
    }, { transaction });

    // asociar grupos base si vienen
    if (Array.isArray(gruposBaseIds) && gruposBaseIds.length) {
      // usar la relación de sequelize si existe setGrupos, sino insertar en CategoriaGrupos
      if (typeof categoria.setGrupos === 'function') {
        await categoria.setGrupos(gruposBaseIds, { transaction });
      } else {
        // fallback: insertar manualmente
        for (const gid of gruposBaseIds) {
          await CategoriaGrupos.create({ categoriaId: categoria.id, grupoId: gid }, { transaction });
        }
      }
    }

    // función recursiva para crear subcategorias
    const crearSubCategoriaRecursiva = async (subData, parentId) => {
      const { nombre: subNombre, definicion: subDef = {}, subCategorias: nested = [] } = subData;
      const subAcronimo = generarAcronimo(subNombre || '');
      const nueva = await db.Categoria.create({
        nombre: subNombre,
        acronimo: subAcronimo,
        definicion: subDef || {}
      }, { transaction });

      // si queremos que subcategoría herede la relación de grupo del padre, duplicamos asociaciones
      // (opcional) aqui vinculamos la misma relación a grupos base que el padre si subData.gruposBaseIds no viene
      if (Array.isArray(subData.gruposBaseIds) && subData.gruposBaseIds.length) {
        if (typeof nueva.setGrupos === 'function') {
          await nueva.setGrupos(subData.gruposBaseIds, { transaction });
        } else {
          for (const gid of subData.gruposBaseIds) {
            await CategoriaGrupos.create({ categoriaId: nueva.id, grupoId: gid }, { transaction });
          }
        }
      }

      // crear sub-subcategorias recursivamente
      if (nested && nested.length) {
        for (const s of nested) {
          await crearSubCategoriaRecursiva(s, nueva.id);
        }
      }

      return nueva;
    };

    if (Array.isArray(subCategorias) && subCategorias.length) {
      for (const s of subCategorias) {
        await crearSubCategoriaRecursiva(s, categoria.id);
      }
    }

    await transaction.commit();

    // Propagar desde la categoria creada (no bloquea respuesta si falla)
    // try {
    //   await propagateFrom('categoria', categoria.id, { removeMissing: false, sequelizeOverride: sequelize });
    // } catch (propErr) {
    //   console.error('Error propagando desde nueva categoría:', propErr);
    // }

    return NextResponse.json({ categoria }, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creando categoría:', error);
    return NextResponse.json({ message: 'Error creando categoría', error: error.message }, { status: 500 });
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