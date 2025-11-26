import { Activo, Cliente, Empleado, HorasTrabajadas, ODT } from "@/models";
import { NextResponse } from "next/server";

// =======================
// GET todas las ODTs
// =======================
export async function GET() {
  try {
    const odts = await ODT.findAll({
      include: [
        { model: Cliente, as: "cliente" },
        { model: Activo, as: "vehiculos" },
        { model: Empleado, as: "empleados" },
        { model: HorasTrabajadas },
      ],
    });
    return NextResponse.json(odts);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =======================
// POST nueva ODT
// =======================
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      nroODT,
      fecha,
      descripcionServicio,
      horaLlegada,
      horaSalida,
      clienteId,
      vehiculosPrincipales,
      vehiculosRemolque,
      choferes,
      ayudantes,
    } = body;

    const nuevaODT = await ODT.create({
      nroODT,
      fecha,
      descripcionServicio,
      horaLlegada,
      horaSalida,
      clienteId,
    });

    // Relacionar vehículos principales
    if (vehiculosPrincipales) {
      await nuevaODT.addVehiculos(vehiculosPrincipales, { through: { tipo: "principal" } });
    }

    // Relacionar vehículos remolque
    if (vehiculosRemolque) {
      await nuevaODT.addVehiculos(vehiculosRemolque, { through: { tipo: "remolque" } });
    }

    // Relacionar choferes
    if (choferes) {
      await nuevaODT.addEmpleados(choferes, { through: { rol: "chofer" } });
    }

    // Relacionar ayudantes
    if (ayudantes) {
      await nuevaODT.addEmpleados(ayudantes, { through: { rol: "ayudante" } });
    }

    return NextResponse.json(nuevaODT, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}