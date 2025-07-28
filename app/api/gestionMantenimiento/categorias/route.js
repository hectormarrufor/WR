// app/api/gestionMantenimiento/categorias/route.js
import db from '@/models';
import { NextResponse } from 'next/server';

// GET all categories
export async function GET(request) {
    try {
        const categorias = await db.Categoria.findAll({
            include: [{
                model: db.Categoria,
                as: 'subCategorias',
                attributes: ['id', 'nombre'],
            }]
        });
        return NextResponse.json(categorias);
    } catch (error) {
        console.error('Error fetching categories:', error);
        // Return a 500 error with a message
        return NextResponse.json({ message: 'Error al obtener categorías', error: error.message }, { status: 500 });
    }
}

// POST a new category
export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { grupoIds, ...categoriaData } = body;

        if (!grupoIds || grupoIds.length === 0) {
            return NextResponse.json({ message: 'Se requiere al menos un grupo base.' }, { status: 400 });
        }

        const nuevaCategoria = await db.Categoria.create(categoriaData, { transaction });

        // Asociar la categoría con los grupos seleccionados
        await nuevaCategoria.setGrupos(grupoIds, { transaction });

        await transaction.commit();

        const result = await db.Categoria.findByPk(nuevaCategoria.id, {
             include: [{
                model: db.Grupo,
                as: 'grupos',
                attributes: ['id', 'nombre'],
                through: { attributes: [] }
            }]
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating category:', error);
        return NextResponse.json({ message: 'Error al crear la categoría', error: error.message }, { status: 400 });
    }
}