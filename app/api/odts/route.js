import db, { Activo, Cliente, Empleado, HorasTrabajadas, ODT } from "@/models";
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
  const transaction = await db.sequelize.transaction();

  try {
    const body = await req.json();
    console.log(body);
    const {
      clienteId,
      vehiculosPrincipales,
      vehiculosRemolque,
      choferes,
      ayudantes,
      ...odtData
    } = body;



    const nuevaODT = await ODT.create(odtData, { transaction });
    // Asociar vehículos principales

    const vehiculos = await Activo.findAll({
      transaction
    });

    await nuevaODT.addVehiculos(vehiculos, { transaction });
    if (vehiculosPrincipales && vehiculosPrincipales.length > 0) {
      await nuevaODT.addVehiculos(vehiculosPrincipales, { transaction });
    }
    // Asociar vehículos remolque
    if (vehiculosRemolque && vehiculosRemolque.length > 0) {
      await nuevaODT.addVehiculos(vehiculosRemolque, { transaction });
    }
    // Asociar choferes
    if (choferes && choferes.length > 0) {
      await nuevaODT.addEmpleados(choferes, { transaction });
    }
    // Asociar ayudantes
    if (ayudantes && ayudantes.length > 0) {
      await nuevaODT.addEmpleados(ayudantes, { transaction });
    }
    // Asociar cliente
    if (clienteId) {
      const cliente = await Cliente.findByPk(clienteId, { transaction });
      if (cliente) {
        await nuevaODT.setCliente(cliente);
      }
    }

    await transaction.commit();


    return NextResponse.json(nuevaODT, { status: 201 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}