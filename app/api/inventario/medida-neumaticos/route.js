// src/app/api/inventario/medida-neumaticos/route.js

import db from '@/models';
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';

export async function GET() {
    try {
        const medidas = await db.MedidaNeumatico.findAll();
        return NextResponse.json({ success: true, data: medidas });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        let medidasNuevas = body.medidas;

        if (!Array.isArray(medidasNuevas)) {
            medidasNuevas = [medidasNuevas];
        }

        // 1. Encontrar o crear la única fila del modelo.
        // Usamos findOne para buscar la fila existente. Si no se encuentra, la creamos.
        let medidaRow = await db.MedidaNeumatico.findOne();

        if (!medidaRow) {
            medidaRow = await db.MedidaNeumatico.create({ medida: [] });
        }

        // 2. Combinar las medidas existentes con las nuevas y eliminar duplicados.
        const medidasActuales = medidaRow.medida || [];
        const todasLasMedidas = new Set([...medidasActuales, ...medidasNuevas]);
        const medidasSinDuplicados = Array.from(todasLasMedidas).filter(m => m !== null && m !== '');
        
        // 3. Ordenar el array para mantener la consistencia
        medidasSinDuplicados.sort();

        // 4. Actualizar la fila con el nuevo array de medidas
        await medidaRow.update({ medida: medidasSinDuplicados });
        
        return NextResponse.json({ success: true, data: medidaRow }, { status: 201 });
    } catch (error) {
        console.error("ERROR en la API de medidas de neumáticos:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}