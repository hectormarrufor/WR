import { NextResponse } from "next/server";
import db from "@/models";

// GET: Obtener precios actuales (El último de cada tipo)
export async function GET() {
    try {
        const precioPeaje5ejes = await db.HistorialPrecio.findOne({
            where: { tipo: 'Peaje 5 ejes' },
            order: [['fechaVigencia', 'DESC']] // El más reciente
        });
        const precioPeaje6ejes = await db.HistorialPrecio.findOne({
            where: { tipo: 'Peaje 6 ejes' },
            order: [['fechaVigencia', 'DESC']]
        });
        const precioPeaje4ejes = await db.HistorialPrecio.findOne({
            where: { tipo: 'Peaje 4 ejes' },
            order: [['fechaVigencia', 'DESC']]
        });
        const precioPeaje3ejes = await db.HistorialPrecio.findOne({
            where: { tipo: 'Peaje 3 ejes' },
            order: [['fechaVigencia', 'DESC']]
        });
        const precioPeajeVehiculoLiviano = await db.HistorialPrecio.findOne({
            where: { tipo: 'Peaje Vehiculo Liviano' },
            order: [['fechaVigencia', 'DESC']]
        });


        const precioGasoil = await db.HistorialPrecio.findOne({
            where: { tipo: 'Gasoil' },
            order: [['fechaVigencia', 'DESC']]
        });

        return NextResponse.json({
            peaje5ejes: precioPeaje5ejes?.precio || 0,
            peaje6ejes: precioPeaje6ejes?.precio || 0,
            peaje4ejes: precioPeaje4ejes?.precio || 0,
            peaje3ejes: precioPeaje3ejes?.precio || 0,
            peajeVehiculoLiviano: precioPeajeVehiculoLiviano?.precio || 0,
            gasoil: precioGasoil?.precio || 0
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Actualizar precio (Crea un nuevo registro en el historial)
export async function POST(request) {
    try {
        const { tipo, nuevoPrecio, usuarioId } = await request.json();

        const registro = await db.HistorialPrecio.create({
            tipo, // 'Peaje' o 'Gasoil'
            precio: nuevoPrecio,
            fechaVigencia: new Date(),
            registradoPor: usuarioId
        });

        return NextResponse.json({ success: true, data: registro });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}