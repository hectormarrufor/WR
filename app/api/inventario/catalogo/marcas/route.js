import db from '@/models';
import { NextResponse } from 'next/server';

/**
 * GET: Obtiene una lista de todas las marcas.
 */
export async function GET(request) {
     const { searchParams } = new URL(request.url);
        const tipo = searchParams.get('tipo');

        const whereClause = tipo ? { where: { tipo } } : {};
        console.log("tipo recibido en marcas:", tipo);
    try {
        const marcas = await db.Marca.findAll({
            ...whereClause,
            attributes: ['id', 'nombre'],
            order: [['nombre', 'ASC']]
        });
        return NextResponse.json({ success: true, data: marcas });
    } catch (error) {
        console.error("Error al obtener las marcas:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST: Crea una nueva marca o la encuentra si ya existe.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const nombreMarca = body.valor;
        const tipo = body.tipo;
        console.log("nombre de la marca", nombreMarca, "tipo", tipo)

        if (!nombreMarca) {
            return NextResponse.json({ success: false, error: "El nombre de la marca es obligatorio." }, { status: 400 });
        }

        // Utilizamos findOrCreate para evitar duplicados.
        const [marca, created] = await db.Marca.findOrCreate({
            where: { nombre: nombreMarca, tipo: tipo },
            defaults: { nombre: nombreMarca, tipo: tipo }
        });

        // Retornamos la marca creada o encontrada.
        return NextResponse.json({ success: true, data: marca, created }, { status: created ? 201 : 200 });
    } catch (error) {
        console.error("Error al crear o encontrar la marca:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}