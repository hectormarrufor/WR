// app/api/odts/check-number/route.js
import { NextResponse } from "next/server";
import { ODT } from "@/models"; // Ajusta tu importación de modelos

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const nro = searchParams.get("nro");

    if (!nro) {
      return NextResponse.json({ error: "Nro requerido" }, { status: 400 });
    }

    // Buscamos si existe alguna ODT con ese número exacto
    const odtEncontrada = await ODT.findOne({
      where: { nroODT: nro },
      attributes: ['id'] // Solo necesitamos el ID, nada más
    });

    if (odtEncontrada) {
      return NextResponse.json({ exists: true, id: odtEncontrada.id });
    } else {
      return NextResponse.json({ exists: false });
    }

  } catch (error) {
    console.error("Error verificando número ODT:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}