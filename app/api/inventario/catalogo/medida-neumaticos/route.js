import db from '@/models';
import { NextResponse } from 'next/server';

// filepath: c:\Users\Hector Marrufo\Documents\App Web DADICA hector marrufo\WR\app\api\inventario\catalogo\medida-neumaticos\route.js

/**
 * GET: Obtiene una lista de todas las medidas de neumáticos.
 */
export async function GET() {
    try {
        const medidas = await db.MedidaNeumatico.findAll({
            attributes: ['id', 'medida'],
            order: [['medida', 'ASC']]
        });
        console.log("Medidas obtenidas:", medidas);
        return NextResponse.json({ success: true, data: medidas });
    } catch (error) {
        console.error("Error al obtener las medidas:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST: Crea una nueva medida o la encuentra si ya existe.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        // El componente AsyncCatalogComboBox envía el valor nuevo en la propiedad 'valor'
        const valorMedida = body.valor;
        console.log("valor de la medida", valorMedida);

        if (!valorMedida) {
            return NextResponse.json({ success: false, error: "El valor de la medida es obligatorio." }, { status: 400 });
        }

        // Utilizamos findOrCreate para evitar duplicados.
        const [medida, created] = await db.MedidaNeumatico.findOrCreate({
            where: { medida: valorMedida },
            defaults: { medida: valorMedida }
        });

        // Retornamos la medida creada o encontrada.
        return NextResponse.json({ success: true, data: medida, created }, { status: created ? 201 : 200 });
    } catch (error) {
        console.error("Error al crear o encontrar la medida:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}