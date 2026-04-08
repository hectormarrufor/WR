// app/api/gastos-variables/route.js
import { NextResponse } from 'next/server';
import db from '@/models';

export async function GET() {
    try {
        // Traemos los gastos con las relaciones para saber de dónde vienen
        const gastos = await db.GastoVariable.findAll({
            include: [
                { model: db.Empleado, as: 'empleado', attributes: ['nombre', 'apellido'] },
                { model: db.Flete, as: 'flete', attributes: ['nroFlete'] },
                // Puedes incluir ordenCompra o activo si las necesitas
            ],
            order: [['fechaGasto', 'DESC']],
            limit: 100 // Límite por rendimiento, luego le puedes meter paginación
        });

        return NextResponse.json(gastos);
    } catch (error) {
        console.error("Error GET Gastos Variables:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}