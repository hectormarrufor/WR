import db from '@/models';
import { NextResponse } from 'next/server';

/**
 * GET: Obtiene una lista de todos los talleres.
 */
export async function GET(request) {
    try {
        const talleres = await db.Taller.findAll({
            attributes: ['id', 'nombre', 'telefono', 'direccion'],
            order: [['nombre', 'ASC']]
        });

        return NextResponse.json({ success: true, data: talleres });
    } catch (error) {
        console.error("Error al obtener los talleres:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST: Crea un nuevo taller o lo encuentra si ya existe.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        // El frontend puede enviar 'valor' (como en el ejemplo de viscosidades) o 'nombre' directamente.
        // Adaptamos para soportar ambos o campos adicionales.
        const nombre = body.nombre || body.valor;
        const telefono = body.telefono || null;
        const direccion = body.direccion || null;

        if (!nombre) {
            return NextResponse.json({ success: false, error: "El nombre del taller es obligatorio." }, { status: 400 });
        }

        // Utilizamos findOrCreate para evitar duplicados por nombre.
        const [taller, created] = await db.Taller.findOrCreate({
            where: { nombre: nombre },
            defaults: { 
                nombre,
                telefono,
                direccion
            }
        });

        // Si ya existía pero se enviaron datos nuevos (teléfono o dirección), se podrían actualizar aquí si fuera necesario.
        // Por ahora mantenemos la lógica de solo devolver el existente.

        return NextResponse.json({ success: true, data: taller, created }, { status: created ? 201 : 200 });
    } catch (error) {
        console.error("Error al crear o encontrar el taller:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

