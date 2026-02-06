import { NextResponse } from "next/server";
import { ODT, sequelize } from "@/models"; 
import { Op } from "sequelize";
import { subDays, format } from "date-fns";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaStr = searchParams.get("fecha"); // YYYY-MM-DD

    if (!fechaStr) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
    }

    const fechaActual = new Date(fechaStr + "T00:00:00");
    const fechaAyer = subDays(fechaActual, 1);
    const fechaAyerStr = format(fechaAyer, "yyyy-MM-dd");

    // Buscamos ODTs que:
    // 1. Sean del día seleccionado EXACTO.
    // 2. O sean del día ANTERIOR, pero que crucen la medianoche (horaSalida < horaLlegada).
    const odts = await ODT.findAll({
      where: {
        [Op.or]: [
          { fecha: fechaStr }, // Caso normal
          { 
            fecha: fechaAyerStr, 
            horaSalida: { [Op.lt]: sequelize.col('horaLlegada') } // Caso: ODT de ayer que termina hoy
          }
        ]
      },
      attributes: [
        'id', 'nroODT', 'fecha', 'horaLlegada', 'horaSalida',
        'choferId', 'ayudanteId', 'vehiculoPrincipalId', 
        'vehiculoRemolqueId', 'maquinariaId'
      ]
    });

    return NextResponse.json(odts);
  } catch (error) {
    console.error("Error fetching ODTs availability:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}