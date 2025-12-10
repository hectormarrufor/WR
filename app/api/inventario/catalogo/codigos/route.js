import db from '@/models';
import { NextResponse } from 'next/server';

/**
 * GET: Obtiene una lista de todos los códigos.
 */
export async function GET() {
    try {
        const codigos = await db.Codigo.findAll({
            attributes: ['id', 'nombre'],
            order: [['nombre', 'ASC']]
        });
        return NextResponse.json({ success: true, data: codigos });
    } catch (error) {
        console.error("Error al obtener los códigos:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST: Crea una nueva marca o la encuentra si ya existe.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const nombreCodigo = body.valor;
        console.log("nombre del código", nombreCodigo)

        if (!nombreCodigo) {
            return NextResponse.json({ success: false, error: "El nombre del código es obligatorio." }, { status: 400 });
        }

        // Utilizamos findOrCreate para evitar duplicados.
        const [codigo, created] = await db.Codigo.findOrCreate({
            where: { nombre: nombreCodigo },
            defaults: { nombre: nombreCodigo }
        });

        // Retornamos el código creado o encontrado.
        return NextResponse.json({ success: true, data: codigo, created }, { status: created ? 201 : 200 });
    } catch (error) {
        console.error("Error al crear o encontrar el código:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}