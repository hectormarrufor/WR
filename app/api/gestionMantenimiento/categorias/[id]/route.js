// app/api/gestionMantenimiento/categorias/[id]/route.js
import db from '@/models';
import { NextResponse } from 'next/server';

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
    const { id } = await params;
    try {
        const categoria = await db.Categoria.findByPk(id);
        if (!categoria) {
            return NextResponse.json({ message: 'Categoría no encontrada' }, { status: 404 });
        }
        await categoria.destroy();
        return NextResponse.json({ message: 'Categoría eliminada exitosamente' }, { status: 200 });
    } catch (error) {
         console.error('Error al eliminar la categoría:', error);
        return NextResponse.json({ message: 'Error al eliminar la categoría', error: error.message }, { status: 500 });
    }
}