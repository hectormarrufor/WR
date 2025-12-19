import db from "@/models";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const data = await request.json();
        
        const result = await db.sequelize.transaction(async (t) => {
            // 1. Create the Aceite specific record
            const nuevoAceite = await db.Aceite.create({
                marca: data.marca,
                tipo: data.tipo, // mineral, semi, sintético
                modelo: data.modelo,
                viscosidad: data.viscosidad,
                aplicacion: data.aplicacion,
            }, { transaction: t });

            // 2. Create the general Consumible record linking to the Aceite
            const nuevoConsumible = await db.Consumible.create({
                nombre: data.nombre || `Aceite ${data.marca} ${data.modelo} ${data.viscosidad}`,
                categoria: "aceite de motor",
                stock: data.descripcion || `Aceite ${data.tipo} ${data.viscosidad}`, // Using 'stock' field for description as seen in previous example
                cantidad: data.cantidad || 0,
                tipo: "aceite",
                AceiteId: nuevoAceite.id, // Assuming the foreign key in Consumible is AceiteId based on association logic
            }, { transaction: t });

            // If the association is defined the other way around (Aceite belongsTo Consumible), 
            // you might need to update the Aceite with the Consumible ID, but usually 
            // the specific item points to the general item or vice versa depending on your exact schema.
            // Based on the provided Aceite model: Aceite.belongsTo(models.Consumible, { foreignKey: 'consumibleId' });
            // If Aceite has 'consumibleId', we need to update it:
            
            await nuevoAceite.update({ consumibleId: nuevoConsumible.id }, { transaction: t });

            return { ...nuevoAceite.toJSON(), consumible: nuevoConsumible.toJSON() };
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        console.error("Error creating aceite de motor:", error);
        return NextResponse.json(
            { message: "Error al crear el aceite de motor", error: error.message },
            { status: 500 }
        );
    }
}