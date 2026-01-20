import { HorasTrabajadas } from "@/models";
import { NextResponse } from "next/server";

function calcularHoras(horaEntrada, horaSalida) {
    const [hIn, mIn] = horaEntrada.split(':').map(Number);
    const [hOut, mOut] = horaSalida.split(':').map(Number);

    let entrada = hIn * 60 + mIn;
    let salida = hOut * 60 + mOut;

    // Si la salida es menor que la entrada, significa que pasó la medianoche
    if (salida < entrada) {
        salida += 24 * 60;
    }

    const diffMin = salida - entrada;
    return diffMin / 60; // devolver en horas decimales
}

export async function GET(req) {
    try {
        const horas = await HorasTrabajadas.findAll();
        return NextResponse.json(horas, { status: 200 });
    } catch (error) {
        console.error("Error fetching worked hours:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


export async function POST(req, { params }) {
    
    const { id } =  await params;
    try {
        const body = await req.json();

        const {
            fecha,
            horas,
            origen,
            observaciones,
            creadorId
        } = body;


        const nuevasHoras = await HorasTrabajadas.create({
            horas,
            fecha,
            origen,
            observaciones,
            empleadoId: id,
            creadorId,
        });


        return NextResponse.json(nuevasHoras, { status: 201 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    const {  id } = await params;
    try {
        const hora = await HorasTrabajadas.findOne({
            where: {
                id
            },
        });
        if (!hora) {
            return NextResponse.json({ message: "Hora no encontrada" }, { status: 404 });
        }
        await hora.destroy();
        return NextResponse.json({ message: "Hora eliminada exitosamente" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting worked hour:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}