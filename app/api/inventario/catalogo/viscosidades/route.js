import db from '@/models';
import { NextResponse } from 'next/server';

// filepath: c:\Users\Hector Marrufo\Documents\App Web DADICA hector marrufo\WR\app\api\inventario\catalogo\viscosidades\route.js

/**
 * GET: Obtiene una lista de todas las viscosidades.
 */
export async function GET(request) {

    try {
        const { searchParams } = new URL(request.url);
        const tipo = searchParams.get('tipo');
        console.log("tipo recibido en viscosidades:", tipo);
        const where = {};
        if (tipo) {
            where.tipo = tipo;
        }

        const viscosidades = await db.ViscosidadAceite.findAll({
            where,
            attributes: ['id', 'viscosidades', 'tipo'],
            order: [['viscosidades', 'ASC']]
        });

        // Mapeamos los datos para incluir la propiedad 'nombre' que espera el componente CatalogCombobox
        const data = viscosidades.map(v => ({
            id: v.id,
            nombre: v.viscosidades, // El frontend espera 'nombre'
            tipo: v.tipo,
            viscosidades: v.viscosidades
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error al obtener las viscosidades:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST: Crea una nueva viscosidad o la encuentra si ya existe.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const nombreViscosidad = body.valor;
        const tipo = body.tipo;
        console.log("nombre de la viscosidad", nombreViscosidad, "tipo", tipo)

        if (!nombreViscosidad) {
            return NextResponse.json({ success: false, error: "El nombre de la viscosidad es obligatorio." }, { status: 400 });
        }

        // Utilizamos findOrCreate para evitar duplicados.
        let where = { viscosidades: nombreViscosidad };
        if (tipo) {
            where.tipo = tipo;
        }

        const [viscosidad, created] = await db.ViscosidadAceite.findOrCreate({
            where,
            defaults: { viscosidades: nombreViscosidad, tipo: tipo }
        });

        // Retornamos la viscosidad creada o encontrada.
        return NextResponse.json({ success: true, data: viscosidad, created }, { status: created ? 201 : 200 });
    } catch (error) {
        console.error("Error al crear o encontrar la viscosidad:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}