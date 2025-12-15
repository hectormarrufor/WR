import db from "@/models";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const data = await request.json();
        const { posicion, stock, stockMinimo, costoPromedio, ...rest } = data;

        const result = await db.sequelize.transaction(async (t) => {
            let nuevoFiltro;

            if (data.tipo === "combustible") {
                nuevoFiltro = await db.Filtro.create(data, { transaction: t });
            } else {
                nuevoFiltro = await db.Filtro.create(rest, { transaction: t });
            }

            const nuevoConsumible = await db.Consumible.create({
                nombre: nuevoFiltro.nombre,
                categoria: data.tipo === "aceite" ? "filtro de aceite" :
                          data.tipo === "aire" ? "filtro de aire" :
                          data.tipo === "combustible" ? "filtro de combustible" :
                          data.tipo === "cabina" ? "filtro de cabina" : null,
                stock: nuevoFiltro.descripcion,
                cantidad: nuevoFiltro.cantidad,
                tipo: "filtro",
                filtroId: nuevoFiltro.id,
            }, { transaction: t });

            return nuevoFiltro;
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        console.error("Error creating filtro de aceite:", error);
        return NextResponse.json(
            { message: "Error al crear el filtro de aceite", error: error.message },
            { status: 500 }
        );
    }
}