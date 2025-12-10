import db from "@/models";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const data = await request.json();
        

        const nuevoFiltro = await db.Filtro.create(data);
      

        return NextResponse.json(nuevoFiltro, { status: 201 });
    } catch (error) {
        console.error("Error creating filtro de aceite:", error);
        return NextResponse.json(
            { message: "Error al crear el filtro de aceite", error: error.message },
            { status: 500 }
        );
    }
}