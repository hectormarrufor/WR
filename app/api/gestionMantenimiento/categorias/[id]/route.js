// app/api/gestionMantenimiento/categorias/[id]/route.js
import db from '@/models';
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { propagateFrom } from '../../helpers/propagate';
import sequelize from '@/sequelize';



// GET para obtener una categoría específica por ID
export async function GET(request, { params }) {
    const { id } = await params;
    try {
        const categoria = await db.Categoria.findByPk(id, {
            include: [{
                model: db.Grupo,
                as: 'gruposBase',
                attributes: ['id', 'nombre', 'definicion'], // Incluimos la definición para reconstruir el estado
                through: { attributes: [] }
            },{
                model: db.Categoria,
                as: 'subCategorias',
                attributes: ['id', 'nombre', 'definicion'],
                include: [{
                    model: db.Grupo,
                    as: 'gruposBase',
                    attributes: ['id', 'nombre'],
                    through: { attributes: [] }
                }]
            }],
        });

        if (!categoria) {
            return NextResponse.json({ message: 'Categoría no encontrada' }, { status: 404 });
        }

        return NextResponse.json(categoria);
    } catch (error) {
        console.error('Error al obtener la categoría:', error);
        return NextResponse.json({ message: 'Error al obtener la categoría', error: error.message }, { status: 500 });
    }
}

// PUT para actualizar una categoría
export async function PUT(request, { params }) {
  const { id } = await params;
  const transaction = await sequelize.transaction();
  try {
    const body = await request.json();
    const {
      nombre,
      definicion = {},
      gruposBaseIds = [], // si quieres actualizar asociaciones
      subCategorias = []  // estructura para recrear subcategorias si haces replace
    } = body;

    const categoria = await db.Categoria.findByPk(id, { transaction });
    if (!categoria) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Categoría no encontrada' }, { status: 404 });
    }

    // actualizar nombre y definicion
    await categoria.update({ nombre: nombre ?? categoria.nombre, definicion: definicion ?? categoria.definicion }, { transaction });

    // actualizar asociaciones con grupos base si vienen
    if (Array.isArray(gruposBaseIds) && gruposBaseIds.length) {
      if (typeof categoria.setGrupos === 'function') {
        await categoria.setGrupos(gruposBaseIds, { transaction });
      } else {
        // fallback: eliminar existentes y crear nuevos
        await CategoriaGrupos.destroy({ where: { categoriaId: categoria.id }, transaction });
        for (const gid of gruposBaseIds) {
          await CategoriaGrupos.create({ categoriaId: categoria.id, grupoId: gid }, { transaction });
        }
      }
    }

    // Si envías subCategorias en el body como reemplazo completo, puedes recrearlas:
    // primero eliminar subcategorias que tengan parent = this id (si manejas parentId en Categoria)
    // pero en tu modelo Categoria no está claro si hay parentId; si lo tienes, usa esa lógica.
    // Aquí dejo ejemplo no destructivo por defecto: no tocar subcategorias si no envías explicitamente un flag.

    await transaction.commit();

    // Propagar cambios en cascada desde la categoria (no revertir si falla)
    try {
      await propagateFrom('categoria', categoria.id, { removeMissing: false, sequelizeOverride: sequelize });
    } catch (propErr) {
      console.error('Error propagando cambios desde categoría:', propErr);
    }

    // responder con la categoria actualizada
    const categoriaActualizada = await db.Categoria.findByPk(id);
    return NextResponse.json({ categoria: categoriaActualizada }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error actualizando categoría:', error);
    return NextResponse.json({ message: 'Error actualizando categoría', error: error.message }, { status: 500 });
  }
}



// DELETE para eliminar una categoría (opcional, pero buena práctica tenerlo)
export async function DELETE(request, { params }) {
    const { id: categoriaId } = await params;
    const transaction = await db.sequelize.transaction();

    try {
        // 1. Verificar que la categoría existe
        const categoria = await db.Categoria.findByPk(categoriaId, { transaction });
        if (!categoria) {
            await transaction.rollback();
            return NextResponse.json({ message: 'Categoría no encontrada' }, { status: 404 });
        }

        // 2. Encontrar todos los Modelos que pertenecen a esta Categoría
        const modelos = await db.Modelo.findAll({
            where: { categoriaId: categoriaId },
            attributes: ['id'],
            transaction
        });
        const modeloIds = modelos.map(m => m.id);

        if (modeloIds.length > 0) {
            // 3. Encontrar todos los Activos que pertenecen a esos Modelos
            const activos = await db.Activo.findAll({
                where: { modeloId: { [Op.in]: modeloIds } },
                attributes: ['id'],
                transaction
            });
            const activoIds = activos.map(a => a.id);

            if (activoIds.length > 0) {
                // 4. Encontrar todos los Mantenimientos asociados a esos Activos
                const mantenimientos = await db.Mantenimiento.findAll({
                    where: { activoId: { [Op.in]: activoIds } },
                    attributes: ['id'],
                    transaction
                });
                const mantenimientoIds = mantenimientos.map(m => m.id);

                if (mantenimientoIds.length > 0) {
                    // 5. Eliminar Tareas de Mantenimiento (dependen de Mantenimiento)
                    await db.TareaMantenimiento.destroy({
                        where: { mantenimientoId: { [Op.in]: mantenimientoIds } },
                        transaction
                    });
                }

                // 6. Eliminar Hallazgos (dependen de Activo, Inspeccion y Mantenimiento)
                await db.Hallazgo.destroy({
                    where: { activoId: { [Op.in]: activoIds } },
                    transaction
                });

                // 7. Eliminar Mantenimientos
                await db.Mantenimiento.destroy({
                    where: { id: { [Op.in]: mantenimientoIds } },
                    transaction
                });
                
                // 8. Eliminar Inspecciones
                await db.Inspeccion.destroy({
                    where: { activoId: { [Op.in]: activoIds } },
                    transaction
                });

                // 9. Eliminar Kilometrajes y Horómetros
                await db.Kilometraje.destroy({
                    where: { activoId: { [Op.in]: activoIds } },
                    transaction
                });
                await db.Horometro.destroy({
                    where: { activoId: { [Op.in]: activoIds } },
                    transaction
                });

                // 10. Eliminar los Activos
                await db.Activo.destroy({
                    where: { id: { [Op.in]: activoIds } },
                    transaction
                });
            }

            // 11. Eliminar los Modelos
            await db.Modelo.destroy({
                where: { id: { [Op.in]: modeloIds } },
                transaction
            });
        }

        // 12. Finalmente, eliminar la Categoría principal
        await categoria.destroy({ transaction });

        // Si todo salió bien, confirmamos la transacción
        await transaction.commit();

        return NextResponse.json({ message: 'Categoría y toda su data asociada eliminadas exitosamente.' }, { status: 200 });

    } catch (error) {
        // Si algo falla, revertimos todos los cambios
        await transaction.rollback();
        console.error('Error al eliminar la categoría en cascada:', error);
        // Devolvemos el error original para que sepas qué falló
        return NextResponse.json({
            message: 'Error al eliminar la categoría.',
            error: error.message,
            detail: error.original?.detail // A menudo aquí está la causa raíz
        }, { status: 500 });
    }
}