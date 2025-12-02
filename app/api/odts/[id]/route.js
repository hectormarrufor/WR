import db, { Activo, Cliente, Empleado, HorasTrabajadas, ODT, ODT_Empleados, ODT_Vehiculos } from "@/models";
import { NextResponse } from "next/server";

// =======================
// GET ODT específica
// =======================
export async function GET(_, { params }) {
  try {
    const { id } = await params;
    const odt = await ODT.findByPk(id, {
      include: [
        { model: Cliente, as: "cliente" },
        { model: Activo, as: "vehiculos" },
        { model: Empleado, as: "empleados" },
        { model: HorasTrabajadas },
      ],
    });
    if (!odt) return NextResponse.json({ error: "ODT no encontrada" }, { status: 404 });
    return NextResponse.json(odt);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =======================
// PUT ODT específica
// =======================
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const odt = await ODT.findByPk(id);
    if (!odt) return NextResponse.json({ error: "ODT no encontrada" }, { status: 404 });

    await odt.update(body);
    return NextResponse.json(odt);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =======================
// DELETE ODT específica
// =======================
export async function DELETE(_, { params }) {
  try {
    const { id } = await params;
    const odt = await ODT.findByPk(id);
    if (!odt) return NextResponse.json({ error: "ODT no encontrada" }, { status: 404 });
    // Para borrar todo de una vez
    //     await db.sequelize.query(`
    //   TRUNCATE TABLE "ODT_Vehiculos", "ODT_Empleados", "HorasTrabajadas", "ODTs" RESTART IDENTITY CASCADE;
    // `);


    await odt.destroy();
    return NextResponse.json({ message: "ODT eliminada correctamente" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}