import db, { Activo, Cliente, Empleado, HorasTrabajadas, Modelo, ODT, ODT_Empleados, ODT_Vehiculos } from "@/models";
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
// GET todas las ODTs
// =======================
export async function GET() {
  try {
    const odts = await ODT.findAll({
      include: [
        { model: Cliente, as: "cliente" },
        { model: Activo, as: "vehiculos", include: [{ model: Modelo, as: "modelo"  }] },
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

    const {

      vehiculosPrincipales,
      vehiculosRemolque,
      choferes,
      ayudantes,
      ...odtData
    } = body;

    // odtData.horaLlegada = odtData.horaLlegada.length === 5
    //   ? odtData.horaLlegada + ':00'
    //   : odtData.horaLlegada;

    // odtData.horaSalida = odtData.horaSalida.length === 5
    //   ? odtData.horaSalida + ':00'
    //   : odtData.horaSalida;


    console.log("creando la odt con: ", odtData);
    const nuevaODT = await ODT.create(odtData, { transaction });
    // Asociar vehículos principales
    console.log("asiociando vehiculos principales")
    // Vehículos principales
    if (vehiculosPrincipales?.length) {
      for (const id of vehiculosPrincipales) {
        await ODT_Vehiculos.create({
          odtId: nuevaODT.id,
          activoId: id,
          tipo: 'principal'
        }, { transaction });
      }
    }
    console.log("asiociando vehiculos remolque")
    // Vehículos remolque
    if (vehiculosRemolque?.length) {
      for (const id of vehiculosRemolque) {
        await ODT_Vehiculos.create({
          odtId: nuevaODT.id,
          activoId: id,
          tipo: 'remolque'
        }, { transaction });
      }
    }
    console.log("asiociando choferes y ayudantes")
    // Choferes
    if (choferes?.length) {
      for (const id of choferes) {
        await ODT_Empleados.create({
          odtId: nuevaODT.id,
          EmpleadoId: id,
          rol: 'chofer'
        }, { transaction });
        // Crear horas trabajadas
        await HorasTrabajadas.create({
         odtId: nuevaODT.id,
          empleadoId: id,
          fecha: odtData.fecha,
          horas: calcularHoras(odtData.horaLlegada, odtData.horaSalida),
          origen: 'odt',
          observaciones: `Horas registradas por ODT #${nuevaODT.nroODT}, desde ${odtData.horaLlegada} hasta ${odtData.horaSalida}. ${odtData.descripcionServicio}`
        }, { transaction });

      }
    }
    console.log("asiociando ayudantes")
    // Ayudantes
    if (ayudantes?.length) {
      for (const id of ayudantes) {
        await ODT_Empleados.create({
          odtId: nuevaODT.id,
          EmpleadoId: id,
          rol: 'ayudante'
        }, { transaction });
        await HorasTrabajadas.create({
          odtId: nuevaODT.id,
          EmpleadoId: id,
          fecha: odtData.fecha,
          horas: calcularHoras(odtData.horaLlegada, odtData.horaSalida),
          origen: 'odt',
          observaciones: `Horas registradas por ODT #${nuevaODT.nroODT}, desde ${odtData.horaLlegada} hasta ${odtData.horaSalida}. ${odtData.descripcionServicio}`
        }, { transaction });

      }
    }


    await transaction.commit();


    return NextResponse.json(nuevaODT, { status: 201 });
  } catch (error) {
    console.log(error);
    await transaction.rollback();

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}