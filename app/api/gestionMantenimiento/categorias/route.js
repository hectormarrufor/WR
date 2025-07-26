// app/api/gestionMantenimiento/categorias/route.js
import db from '@/models';
import { NextResponse } from 'next/server';

// GET para obtener todas las categorías (útil para el siguiente nivel: Modelos)
export async function GET(request) {
    try {
        const categorias = await db.Categoria.findAll({
            include: [{
                model: db.Grupo,
                as: 'grupos',
                attributes: ['id', 'nombre'],
                through: { attributes: [] } // No incluir la tabla intermedia en el resultado
            }],
            order: [['nombre', 'ASC']],
        });
        return NextResponse.json(categorias);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return NextResponse.json({ message: 'Error al obtener categorías', error: error.message }, { status: 500 });
    }
}


// POST para crear una nueva categoría
export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const { nombre, definicion, gruposBaseIds } = await request.json();

        if (!nombre || !definicion || !gruposBaseIds || !Array.isArray(gruposBaseIds) || gruposBaseIds.length === 0) {
            return NextResponse.json({ message: 'Nombre, definición y al menos un grupo base son requeridos.' }, { status: 400 });
        }

        // 1. Crear la categoría
        const nuevaCategoria = await db.Categoria.create({
            nombre,
            definicion,
        }, { transaction });

        // 2. Asociar la categoría con sus grupos base
        await nuevaCategoria.setGrupos(gruposBaseIds, { transaction });

        await transaction.commit();

        // Obtener la categoría creada con sus asociaciones para devolverla
        const categoriaCreada = await db.Categoria.findByPk(nuevaCategoria.id, {
             include: [{
                model: db.Grupo,
                as: 'grupos',
                attributes: ['id', 'nombre'],
                through: { attributes: [] }
            }]
        });

        return NextResponse.json(categoriaCreada, { status: 201 });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al crear la categoría:', error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return NextResponse.json({ message: 'Ya existe una categoría con este nombre.' }, { status: 409 });
        }

        return NextResponse.json({ message: 'Error al crear la categoría', error: error.message }, { status: 500 });
    }
}