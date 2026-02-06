import db, { Activo, Cliente, Empleado, HorasTrabajadas, Horometro, Maquina, MaquinaInstancia, ODT, Remolque, RemolqueInstancia, Vehiculo, VehiculoInstancia } from "@/models";
import { NextResponse } from "next/server";
import { notificarTodos } from "../notificar/route";

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

// Función auxiliar para calcular diferencia en horas decimales
function calcularHoras(horaEntrada, horaSalida) {
  if (!horaEntrada || !horaSalida) return 0;

  // Asumimos formato HH:mm o HH:mm:ss
  const [hIn, mIn] = horaEntrada.split(':').map(Number);
  const [hOut, mOut] = horaSalida.split(':').map(Number);

  let entrada = hIn * 60 + mIn;
  let salida = hOut * 60 + mOut;

  // Si la salida es menor a la entrada, asumimos que cruzó la medianoche (+24h)
  if (salida < entrada) salida += 24 * 60;

  return parseFloat(((salida - entrada) / 60).toFixed(2));
}

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
      // Extraemos para lógica, pero usamos ...odtData para crear
      horaLlegada,
      horaSalida,
      choferEntradaBase,
      choferSalidaBase,
      ayudanteEntradaBase,
      ayudanteSalidaBase,
      ...restoDatos
    } = body;


    const tieneHoras = body.horaLlegada && body.horaSalida;
    const estadoInicial = tieneHoras ? 'Finalizada' : 'En Curso';

    // 1. CREAR LA ODT (Guardamos TODOS los tiempos)
    const nuevaODT = await ODT.create({
      ...restoDatos,
      estado: estadoInicial,
      horaLlegada,
      horaSalida,
      // Campos nuevos de base:
      choferEntradaBase: choferEntradaBase || null,
      choferSalidaBase: choferSalidaBase || null,
      ayudanteEntradaBase: ayudanteEntradaBase || null,
      ayudanteSalidaBase: ayudanteSalidaBase || null,
      // Relaciones:
      choferId,
      ayudanteId,
      vehiculoPrincipalId,
      vehiculoRemolqueId,
      maquinariaId,
      creadoPorId: userId,
    }, { transaction });

    if (tieneHoras) {
        // 2. CÁLCULOS DE TIEMPO

      // A. Horas Labor (Para Vehículos/Maquinaria) -> Usan horaLlegada y horaSalida de la ODT
      const horasLaborVehiculos = calcularHoras(horaLlegada, horaSalida);

      // B. Horas Chofer -> Usa Base o Fallback a Labor
      const finalChoferEntrada = choferEntradaBase || horaLlegada;
      const finalChoferSalida = choferSalidaBase || horaSalida;
      const horasChofer = calcularHoras(finalChoferEntrada, finalChoferSalida);

      // C. Horas Ayudante -> Usa Base o Fallback a Labor
      const finalAyudanteEntrada = ayudanteEntradaBase || horaLlegada;
      const finalAyudanteSalida = ayudanteSalidaBase || horaSalida;
      const horasAyudante = calcularHoras(finalAyudanteEntrada, finalAyudanteSalida);


      // 3. REGISTRO DE HORAS TRABAJADAS (PERSONAL)
      if (choferId) {
        await HorasTrabajadas.create({
          odtId: nuevaODT.id,
          empleadoId: choferId,
          fecha: restoDatos.fecha,
          horas: horasChofer, // <--- Horas calculadas con tiempo de Base
          origen: 'odt',
          observaciones: restoDatos.descripcionServicio
        }, { transaction });
      }

      if (ayudanteId) {
        await HorasTrabajadas.create({
          odtId: nuevaODT.id,
          empleadoId: ayudanteId,
          fecha: restoDatos.fecha,
          horas: horasAyudante, // <--- Horas calculadas con tiempo de Base
          origen: 'odt',
          observaciones: restoDatos.descripcionServicio
        }, { transaction });
      }

      // 4. REGISTRO DE HOROMETROS (VEHÍCULOS)
      // Usan horasLaborVehiculos porque el camión cobra por labor, no por llegada del chofer a base
      const commonHorometroData = {
        fecha_registro: restoDatos.fecha,
        valor: horasLaborVehiculos,
        origen: 'odt',
        odtId: nuevaODT.id,
      };

      if (vehiculoPrincipalId) {
        await Horometro.create({ activoId: vehiculoPrincipalId, ...commonHorometroData, activoId: vehiculoPrincipalId }, { transaction });
      }
      if (vehiculoRemolqueId) {
        await Horometro.create({ activoId: vehiculoRemolqueId, ...commonHorometroData, activoId: vehiculoRemolqueId }, { transaction });
      }
      if (maquinariaId) {
        await Horometro.create({ activoId: maquinariaId, ...commonHorometroData, activoId: maquinariaId }, { transaction });
      }
    }



    await transaction.commit();

    // Notificación (Fuera de transacción para no bloquear)
    try {
      await notificarTodos({
        title: 'Nueva ODT Registrada',
        body: `${nombreCreador} ha creado la ODT #${nuevaODT.nroODT} para el día ${nuevaODT.fecha}.`,
        url: `/superuser/odt/${nuevaODT.id}`,
      });
    } catch (e) { console.error("Error notificando:", e); }

    return NextResponse.json(nuevaODT, { status: 201 });

  } catch (error) {
    console.error("Error POST ODT:", error);
    await transaction.rollback();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}