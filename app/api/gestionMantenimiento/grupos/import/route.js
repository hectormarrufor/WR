import { NextResponse } from 'next/server';
import db from '@/models'; // Asumiendo que tienes un index.js en models
import { crearGrupoRecursivo } from '../route'; // Importamos la función que ya existe

export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();

        // Aquí podrías añadir una validación más robusta del objeto recibido
        if (!body.nombre || !body.definicion) {
            throw new Error("El archivo JSON no tiene el formato de grupo esperado.");
        }

        // Reutilizamos la lógica de creación que ya es transaccional y recursiva
        await crearGrupoRecursivo(body, null, transaction);
        
        await transaction.commit();

        return NextResponse.json({ message: `Grupo "${body.nombre}" importado exitosamente.` }, { status: 201 });

    } catch (error) {
        await transaction.rollback();
        console.error("Error al importar el grupo:", error);
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}