import db from '@/models';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { tipo } = await params;

    if (tipo == 'aceite') {
        try {
            const filtrosAceite = await db.Filtro.findAll({
                where: { tipo: 'aceite' }
            });
            return NextResponse.json(filtrosAceite, { status: 200 });
        } catch (error) {
            console.error("Error fetching filtros de aceite:", error);
            return NextResponse.json(
                { message: "Error al obtener los filtros de aceite", error: error.message },
                { status: 500 }
            );
        }
    } else if (tipo == 'aire') {
        try {
            const filtrosAire = await db.Filtro.findAll({
                where: { tipo: 'aire' }
            });
            return NextResponse.json(filtrosAire, { status: 200 });
        } catch (error) {
            console.error("Error fetching filtros de aire:", error);
            return NextResponse.json(
                { message: "Error al obtener los filtros de aire", error: error.message },
                { status: 500 }
            );
        }
    } else if (tipo == 'combustible') {
        try {
            const filtrosCombustible = await db.Filtro.findAll({
                where: { tipo: 'combustible' }
            });
            return NextResponse.json(filtrosCombustible, { status: 200 });
        } catch (error) {
            console.error("Error fetching filtros de combustible:", error);
            return NextResponse.json(
                { message: "Error al obtener los filtros de combustible", error: error.message },
                { status: 500 }
            );
        }
    } else if (tipo == 'cabina') {
        try {
            const filtrosCabina = await db.Filtro.findAll({
                where: { tipo: 'cabina' }
            });
            return NextResponse.json(filtrosCabina, { status: 200 });
        } catch (error) {
            console.error("Error fetching filtros de cabina:", error);
            return NextResponse.json(
                { message: "Error al obtener los filtros de cabina", error: error.message },
                { status: 500 }
            );
        }
    } else {
        return NextResponse.json(
            { message: "Tipo de filtro no válido" },
            { status: 400 }
        );
    }



}

