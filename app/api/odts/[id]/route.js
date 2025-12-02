import db, { Activo, Cliente, Empleado, HorasTrabajadas, ODT, ODT_Empleados, ODT_Vehiculos } from "@/models";
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
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      vehiculosPrincipales,
      vehiculosRemolque,
      choferes,
      ayudantes,
      clienteId,
      ...odtData
    } = body;

    const odt = await ODT.findByPk(id);
    if (!odt) {
      await transaction.rollback();
      return NextResponse.json({ error: "ODT no encontrada" }, { status: 404 });
    }

    // Actualizar datos base de la ODT
    await odt.update({ ...odtData, clienteId }, { transaction });

    // Limpiar asociaciones previas
    await ODT_Vehiculos.destroy({ where: { odtId: id }, transaction });
    await ODT_Empleados.destroy({ where: { odtId: id }, transaction });
    await HorasTrabajadas.destroy({ where: { odtId: id }, transaction });

    // Reasociar vehículos principales
    if (vehiculosPrincipales?.length) {
      for (const vId of vehiculosPrincipales) {
        await ODT_Vehiculos.create({
          odtId: id,
          activoId: vId,
          tipo: 'principal'
        }, { transaction });
      }
    }

    // Reasociar vehículos remolque
    if (vehiculosRemolque?.length) {
      for (const vId of vehiculosRemolque) {
        await ODT_Vehiculos.create({
          odtId: id,
          activoId: vId,
          tipo: 'remolque'
        }, { transaction });
      }
    }

    // Reasociar choferes
    if (choferes?.length) {
      for (const eId of choferes) {
        await ODT_Empleados.create({
          odtId: id,
          EmpleadoId: eId,
          rol: 'chofer'
        }, { transaction });

        await HorasTrabajadas.create({
          odtId: id,
          empleadoId: eId,
          fecha: odtData.fecha,
          horas: calcularHoras(odtData.horaLlegada, odtData.horaSalida),
          origen: 'odt',
          observaciones: `Horas registradas por ODT #${odt.nroODT}, desde ${odtData.horaLlegada} hasta ${odtData.horaSalida}. ${odtData.descripcionServicio}`
        }, { transaction });
      }
    }

    // Reasociar ayudantes
    if (ayudantes?.length) {
      for (const eId of ayudantes) {
        await ODT_Empleados.create({
          odtId: id,
          EmpleadoId: eId,
          rol: 'ayudante'
        }, { transaction });

        await HorasTrabajadas.create({
          odtId: id,
          empleadoId: eId,
          fecha: odtData.fecha,
          horas: calcularHoras(odtData.horaLlegada, odtData.horaSalida),
          origen: 'odt',
          observaciones: `Horas registradas por ODT #${odt.nroODT}, desde ${odtData.horaLlegada} hasta ${odtData.horaSalida}. ${odtData.descripcionServicio}`
        }, { transaction });
      }
    }

    await transaction.commit();
    return NextResponse.json(odt);
  } catch (error) {
    await transaction.rollback();
    console.error(error);
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