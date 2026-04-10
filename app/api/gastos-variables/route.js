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

export async function POST(req) {
    try {
        // Obtenemos los datos enviados desde el formulario
        const body = await req.json();

        // Creamos el registro en el libro diario (GastoVariable)
        const nuevoGasto = await db.GastoVariable.create({
            fechaGasto: body.fechaGasto,
            tipoOrigen: body.tipoOrigen, // 'Obligación Fija' o 'Gasto Variable'
            descripcion: body.descripcion,
            montoUsd: body.montoUsd,
            referenciaExterna: body.referenciaExterna || null,
            estado: body.estado || 'Pagado'
        });

        return NextResponse.json({ success: true, data: nuevoGasto }, { status: 201 });
    } catch (error) {
        console.error("Error registrando egreso:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}