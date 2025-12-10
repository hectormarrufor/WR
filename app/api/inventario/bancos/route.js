import db from '@/models';
import { NextResponse } from 'next/server';

/**
 * GET: Obtiene una lista de todas las bancos.
 */
export async function GET() {
    try {
        const bancos = await db.Banco.findAll({
            attributes: ['id', 'nombre'],
            order: [['nombre', 'ASC']]
        });
        return NextResponse.json({ success: true, data: bancos });
    } catch (error) {
        console.error("Error al obtener los bancos:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST: Crea una nueva banco o la encuentra si ya existe.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const nombreBanco = body.nombre;

        if (!nombreBanco) {
            return NextResponse.json({ success: false, error: "El nombre del banco es obligatorio." }, { status: 400 });
        }

        // Utilizamos findOrCreate para evitar duplicados.
        const [banco, created] = await db.Banco.findOrCreate({
            where: { nombre: nombreBanco },
            defaults: { nombre: nombreBanco }
        });

        // Retornamos la banco creada o encontrada.
        return NextResponse.json({ success: true, data: banco, created }, { status: created ? 201 : 200 });
    } catch (error) {
        console.error("Error al crear o encontrar el banco:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}