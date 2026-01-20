import { NextResponse } from "next/server";
import { HorasTrabajadas, Empleado } from "@/models";
import { Op } from "sequelize";

export async function GET() {
    try {
        const horas = await HorasTrabajadas.findAll({
            where: {
                origen: { [Op.ne]: 'odt' } // Traer todo lo que NO sea 'odt' (ej: 'manual', 'taller')
            },
            include: [
                { 
                    model: Empleado, 
                    attributes: ['id', 'nombre', 'apellido', 'imagen']
                }
            ]
        });
        return NextResponse.json(horas);
    } catch (error) {
        console.log("Error en GET /rrhh/horas-manuales:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { empleadoId, fecha, horas, observaciones } = body;

        const nuevoRegistro = await HorasTrabajadas.create({
            empleadoId,
            fecha,
            horas,
            observaciones,
            origen: 'manual', // Importante para distinguirlo de ODTs
            creadorId: body.creadorId
        });

        return NextResponse.json(nuevoRegistro);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}