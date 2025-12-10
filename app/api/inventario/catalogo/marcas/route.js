import db from '@/models';
import { NextResponse } from 'next/server';

/**
 * GET: Obtiene una lista de todas las marcas.
 */
export async function GET() {
    try {
        const marcas = await db.Marca.findAll({
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
        console.log("nombre de la marca", nombreMarca)

        if (!nombreMarca) {
            return NextResponse.json({ success: false, error: "El nombre de la marca es obligatorio." }, { status: 400 });
        }

        // Utilizamos findOrCreate para evitar duplicados.
        const [marca, created] = await db.Marca.findOrCreate({
            where: { nombre: nombreMarca },
            defaults: { nombre: nombreMarca }
        });

        // Retornamos la marca creada o encontrada.
        return NextResponse.json({ success: true, data: marca, created }, { status: created ? 201 : 200 });
    } catch (error) {
        console.error("Error al crear o encontrar la marca:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}