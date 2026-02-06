import db, { Activo, Cliente, Empleado, HorasTrabajadas, Horometro, Maquina, MaquinaInstancia, ODT, Remolque, RemolqueInstancia, Vehiculo, VehiculoInstancia } from "@/models";
import { NextResponse } from "next/server";
import { notificarTodos } from "../notificar/route";

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
        {
          model: Activo, as: "vehiculoPrincipal", include: [{
            model: VehiculoInstancia, as: 'vehiculoInstancia',
            include: [{ model: Vehiculo, as: 'plantilla' }]
          }]
        },
        {
          model: Activo, as: "vehiculoRemolque", include: [{
            model: RemolqueInstancia, as: 'remolqueInstancia',
            include: [{ model: Remolque, as: 'plantilla' }]
          }]
        },
        {
          model: Activo, as: "maquinaria", include: [{
            model: MaquinaInstancia, as: 'maquinaInstancia',
            include: [{ model: Maquina, as: 'plantilla' }]
          }]
        },
        { model: Empleado, as: "chofer" },
        { model: Empleado, as: "ayudante" },
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
      userId,
      nombreCreador,
      vehiculoPrincipalId,
      vehiculoRemolqueId,
      maquinariaId,
      choferId,
      ayudanteId,
      ...odtData
    } = body;

    // odtData.horaLlegada = odtData.horaLlegada.length === 5
    //   ? odtData.horaLlegada + ':00'
    //   : odtData.horaLlegada;

    // odtData.horaSalida = odtData.horaSalida.length === 5
    //   ? odtData.horaSalida + ':00'
    //   : odtData.horaSalida;


    console.log("creando la odt con: ", odtData);
    const nuevaODT = await ODT.create({
      ...odtData,
      choferId,
      ayudanteId,
      vehiculoPrincipalId,
      vehiculoRemolqueId,
      maquinariaId,
      creadoPorId: userId,
    }, { transaction });

    // const horasCalculadas = calcularHoras(odtData.horaLlegada, odtData.horaSalida);

    const finalChoferEntrada = body.choferEntradaBase || body.horaLlegada;
    const finalChoferSalida = body.choferSalidaBase || body.horaSalida;
    const finalAyudanteEntrada = body.ayudanteEntradaBase || body.horaLlegada;
    const finalAyudanteSalida = body.ayudanteSalidaBase || body.horaSalida;

    // Al calcular horas para el registro de HorasTrabajadas del CHOFER:
    const horasChofer = calcularHoras(finalChoferEntrada, finalChoferSalida);

    // Al calcular horas para el registro de HorasTrabajadas del AYUDANTE:
    const horasAyudante = calcularHoras(finalAyudanteEntrada, finalAyudanteSalida);

    if (choferId) {
      await HorasTrabajadas.create({
        odtId: nuevaODT.id,
        empleadoId: choferId,
        fecha: odtData.fecha,
        horas: horasChofer,
        origen: 'odt',
        observaciones: odtData.descripcionServicio
      }, { transaction });
    }

    if (ayudanteId) {
      await HorasTrabajadas.create({
        odtId: nuevaODT.id,
        empleadoId: ayudanteId,
        fecha: odtData.fecha,
        horas: horasAyudante,
        origen: 'odt',
        observaciones: odtData.descripcionServicio
      }, { transaction });
    }

    if (vehiculoPrincipalId) {
      await Horometro.create({
        activoId: vehiculoPrincipalId,
        fecha_registro: odtData.fecha,
        valor: horasCalculadas,
        origen: 'odt',
        odtId: nuevaODT.id,
      }, { transaction });
    }
    if (vehiculoRemolqueId) {
      await Horometro.create({
        activoId: vehiculoRemolqueId,
        fecha_registro: odtData.fecha,
        valor: horasCalculadas,
        origen: 'odt',
        odtId: nuevaODT.id,
      }, { transaction });
    }
    if (maquinariaId) {
      await Horometro.create({
        activoId: maquinariaId,
        fecha_registro: odtData.fecha,
        valor: horasCalculadas,
        origen: 'odt',
        odtId: nuevaODT.id,
      }, { transaction });
    }


    await transaction.commit();

    await notificarTodos({
      title: 'Nueva ODT Registrada',
      body: `${nombreCreador} ha creado la ODT #${nuevaODT.nroODT} para el día ${nuevaODT.fecha}.`,
      url: `/superuser/odt/${nuevaODT.id}`,
    });


    return NextResponse.json(nuevaODT, { status: 201 });
  } catch (error) {
    console.log(error);
    await transaction.rollback();

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}