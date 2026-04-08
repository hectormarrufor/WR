import { NextResponse } from 'next/server';
import { Peaje } from '@/models';

export async function GET() {
    try {
        const peajes = await Peaje.findAll({
            order: [['nombre', 'ASC']]
        });
        
        return NextResponse.json({ success: true, data: peajes });
    } catch (error) {
        console.error("Error obteniendo peajes:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        
        if (!body.nombre) {
            throw new Error("El nombre del peaje es obligatorio.");
        }

        const nuevoPeaje = await Peaje.create({
            nombre: body.nombre.trim(),
            latitud: body.latitud || null,
            longitud: body.longitud || null,
            estado: body.estado || null
        });

        return NextResponse.json({ success: true, data: nuevoPeaje }, { status: 201 });
    } catch (error) {
        console.error("Error creando peaje:", error);
        if (error.name === 'SequelizeUniqueConstraintError') {
             return NextResponse.json({ success: false, error: "Ya existe un peaje registrado con ese nombre." }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}