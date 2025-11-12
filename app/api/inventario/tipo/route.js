import db from '@/models';
import { NextResponse } from 'next/server';

/**
 * GET: Obtiene una lista de todos los tipos.
 */
export async function GET() {
    try {
        const tipos = await db.TipoConsumible.findAll({
            order: [['nombre', 'ASC']]
        });
        return NextResponse.json({ success: true, data: tipos });
    } catch (error) {
        console.error("Error al obtener los tipos:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST: Crea una nueva tipo o la encuentra si ya existe.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const nombreTipo = body.nombre;
        const especificaciones = body.especificaciones;
        const unidadMedida = body.unidadMedida;

        if (!nombreTipo) {
            return NextResponse.json({ success: false, error: "El nombre del tipo de consumible es obligatorio." }, { status: 400 });
        }

        // Utilizamos findOrCreate para evitar duplicados.
        const [tipo, created] = await db.TipoConsumible.findOrCreate({
            where: { nombre: nombreTipo },
            defaults: { nombre: nombreTipo, especificaciones: especificaciones, unidadMedida: unidadMedida }
        });

        // Retornamos el tipo creado o encontrada.
        return NextResponse.json({ success: true, data: tipo, created }, { status: created ? 201 : 200 });
    } catch (error) {
        console.error("Error al crear o encontrar el tipo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}