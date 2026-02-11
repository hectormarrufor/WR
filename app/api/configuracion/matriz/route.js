import { NextResponse } from 'next/server';
import db from '@/models';

// GET: Listar todas las matrices (Solo cabecera, sin detalles pesados)
export async function GET() {
    try {
        const matrices = await db.MatrizCosto.findAll({
            attributes: ['id', 'nombre', 'tipoActivo', 'totalCostoKm', 'updatedAt'],
            order: [['nombre', 'ASC']]
        });
        return NextResponse.json(matrices);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Crear una nueva matriz vacía
export async function POST(req) {
    try {
        const body = await req.json(); // { nombre: "Chuto Mack 2026", tipoActivo: "Vehiculo" }
        
        // Validación básica
        if (!body.nombre || !body.tipoActivo) {
            return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
        }

        const nuevaMatriz = await db.MatrizCosto.create({
            nombre: body.nombre,
            tipoActivo: body.tipoActivo,
            totalCostoKm: 0
        });

        return NextResponse.json(nuevaMatriz);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}