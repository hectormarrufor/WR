import db from '@/models';
import { NextResponse } from 'next/server';

// filepath: c:\Users\Hector Marrufo\Documents\App Web DADICA hector marrufo\WR\app\api\inventario\catalogo\modelos\route.js

/**
 * GET: Obtiene una lista de todos los modelos.
 */
export async function GET(request) {
     const { searchParams } = new URL(request.url);
        const tipo = searchParams.get('tipo');
        console.log("tipo recibido en modelos:", tipo);
        const where = {};
        if (tipo) {
            where.tipo = tipo;
        }

    try {
        const modelos = await db.Modelo.findAll({
            where,
            attributes: ['id', 'nombre', 'tipo'],
            order: [['nombre', 'ASC']]
        });
        return NextResponse.json({ success: true, data: modelos });
    } catch (error) {
        console.error("Error al obtener los modelos:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST: Crea un nuevo modelo o lo encuentra si ya existe.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const nombreModelo = body.valor;
        const tipoModelo = body.tipo; // Asumiendo que también se envía el tipo

        console.log("nombre del modelo", nombreModelo);

        if (!nombreModelo) {
            return NextResponse.json({ success: false, error: "El nombre del modelo es obligatorio." }, { status: 400 });
        }

        // Utilizamos findOrCreate para evitar duplicados.
        const [modelo, created] = await db.Modelo.findOrCreate({
            where: { nombre: nombreModelo, tipo: tipoModelo || null },
            defaults: { 
                nombre: nombreModelo,
                tipo: tipoModelo || null 
            }
        });

        // Retornamos el modelo creado o encontrado.
        return NextResponse.json({ success: true, data: modelo, created }, { status: created ? 201 : 200 });
    } catch (error) {
        console.error("Error al crear o encontrar el modelo:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}