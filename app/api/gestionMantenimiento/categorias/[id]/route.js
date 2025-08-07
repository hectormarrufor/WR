// app/api/gestionMantenimiento/categorias/[id]/route.js
import db from '@/models';
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';

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
    const transaction = await db.sequelize.transaction();
    try {
        const { nombre, definicion, gruposBaseIds } = await request.json();

        if (!nombre || !definicion || !gruposBaseIds || !Array.isArray(gruposBaseIds) || gruposBaseIds.length === 0) {
            return NextResponse.json({ message: 'Nombre, definición y al menos un grupo base son requeridos.' }, { status: 400 });
        }

        const categoria = await db.Categoria.findByPk(id, { transaction });
        if (!categoria) {
            await transaction.rollback();
            return NextResponse.json({ message: 'Categoría no encontrada' }, { status: 404 });
        }

        // 1. Actualizar los datos de la categoría
        await categoria.update({
            nombre,
            definicion,
        }, { transaction });

        // 2. Actualizar las asociaciones con los grupos base
        await categoria.setGrupos(gruposBaseIds, { transaction });

        await transaction.commit();

        // Devolver la categoría actualizada
        const categoriaActualizada = await db.Categoria.findByPk(id, {
             include: [{
                model: db.Grupo,
                as: 'gruposBase',
                attributes: ['id', 'nombre'],
                through: { attributes: [] }
            }]
        });

        return NextResponse.json(categoriaActualizada, { status: 200 });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al actualizar la categoría:', error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return NextResponse.json({ message: 'Ya existe una categoría con este nombre.' }, { status: 409 });
        }

        return NextResponse.json({ message: 'Error al actualizar la categoría', error: error.message }, { status: 500 });
    }
}

// DELETE para eliminar una categoría (opcional, pero buena práctica tenerlo)
export async function DELETE(request, { params }) {
    const { id: categoriaId } = params;
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