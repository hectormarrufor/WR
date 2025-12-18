import db from '@/models';
import { NextResponse } from 'next/server';

// filepath: c:\Users\Hector Marrufo\Documents\App Web DADICA hector marrufo\WR\app\api\inventario\catalogo\bancos\route.js

/**
 * GET: Obtiene una lista de todos los bancos.
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
 * POST: Crea un nuevo banco o lo encuentra si ya existe.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const nombreBanco = body.valor;
        console.log("nombre del banco", nombreBanco)

        if (!nombreBanco) {
            return NextResponse.json({ success: false, error: "El nombre del banco es obligatorio." }, { status: 400 });
        }

        // Utilizamos findOrCreate para evitar duplicados.
        const [banco, created] = await db.Banco.findOrCreate({
            where: { nombre: nombreBanco },
            defaults: { nombre: nombreBanco }
        });

        // Retornamos el banco creado o encontrado.
        return NextResponse.json({ success: true, data: banco, created }, { status: created ? 201 : 200 });
    } catch (error) {
        console.error("Error al crear o encontrar el banco:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}