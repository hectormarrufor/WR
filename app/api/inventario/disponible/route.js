import { NextResponse } from "next/server";
import db from "@/models";
import { Op } from "sequelize";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria'); // Ej: "Aceite"
    
    try {
        const whereClause = {
            estado: 'Disponible', // O stockActual > 0
        };

        // Filtro básico por categoría si viene (esto depende de cómo guardes tus categorías en Inventario)
        // Si tu inventario tiene campo 'categoria', úsalo. Si no, busca por nombre.
        if (categoria) {
            whereClause[Op.or] = [
                { categoria: categoria },
                { nombre: { [Op.iLike]: `%${categoria}%` } } // Búsqueda laxa
            ];
        }

        const items = await db.Inventario.findAll({
            where: whereClause,
            attributes: ['id', 'nombre', 'marca', 'stockActual', 'esSerializado', 'serial', 'vidaUtilEstimada'],
            limit: 20 // Para no saturar el select
        });

        return NextResponse.json({ success: true, items });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message });
    }
}