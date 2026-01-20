import db, { Activo, Cliente, Empleado, HorasTrabajadas, Horometro, ODT } from "@/models";
import { NextResponse } from "next/server";
import { Op } from "sequelize"; // Importante para el operador NotIn

function calcularHoras(horaEntrada, horaSalida) {
  if (!horaEntrada || !horaSalida) return 0;
  const [hIn, mIn] = horaEntrada.split(':').map(Number);
  const [hOut, mOut] = horaSalida.split(':').map(Number);

  let entrada = hIn * 60 + mIn;
  let salida = hOut * 60 + mOut;

  if (salida < entrada) salida += 24 * 60;

  return (salida - entrada) / 60;
}

// Función auxiliar para sincronizar (Borrar sobrantes, Actualizar existentes, Crear nuevos)
async function sincronizarRegistros({ 
  model, 
  fkField, 
  itemsNuevos, 
  odtId, 
  datosComunes, 
  transaction 
}) {
  // 1. Identificar IDs actuales que se quedan
  const idsNuevos = itemsNuevos.map(i => i.id).filter(Boolean);

  // 2. BORRAR (Prune): Eliminar los que ya no están en la lista nueva
  await model.destroy({
    where: {
      odtId: odtId,
      origen: 'odt',
      [fkField]: { [Op.notIn]: idsNuevos } // Borra todo lo que NO esté en la lista nueva
    },
    transaction
  });

  // 3. UPSERT (Update or Insert)
  for (const item of itemsNuevos) {
    if (!item.id) continue;

    // Buscamos si ya existe el registro para este ID en esta ODT
    const registroExistente = await model.findOne({
      where: {
        odtId: odtId,
        origen: 'odt',
        [fkField]: item.id
      },
      transaction
    });

    if (registroExistente) {
      // ACTUALIZAR: Solo cambiamos las horas y observaciones
      await registroExistente.update({
        fecha: datosComunes.fecha, // Por si cambió la fecha de la ODT
        [model === Horometro ? 'fecha_registro' : 'fecha']: datosComunes.fecha,
        [model === Horometro ? 'valor' : 'horas']: datosComunes.horas,
        observaciones: item.observaciones
      }, { transaction });
    } else {
      // CREAR: No existía, lo creamos
      await model.create({
        odtId: odtId,
        [fkField]: item.id,
        origen: 'odt',
        [model === Horometro ? 'fecha_registro' : 'fecha']: datosComunes.fecha,
        [model === Horometro ? 'valor' : 'horas']: datosComunes.horas,
        observaciones: item.observaciones
      }, { transaction });
    }
  }
}

// GET se mantiene igual...
export async function GET(req, { params }) {
    try {
        // En Next.js 15 params es una promesa, es buena práctica esperarla
        const { id } = await params; 

        const odt = await ODT.findByPk(id, {
            include: [
                // 1. Cliente
                { model: Cliente, as: "cliente" },
                
                // 2. Personal (Usando los alias definidos en las asociaciones)
                { 
                    model: Empleado, 
                    as: "chofer",
                    attributes: ['id', 'nombre', 'apellido', 'imagen', 'cedula'] 
                },
                { 
                    model: Empleado, 
                    as: "ayudante",
                    attributes: ['id', 'nombre', 'apellido', 'imagen', 'cedula'] 
                },

                // 3. Activos (Usando los alias definidos)
                { 
                    model: Activo, 
                    as: "vehiculoPrincipal",
                    attributes: ['id', 'codigoInterno', 'tipoActivo', 'imagen']
                },
                { 
                    model: Activo, 
                    as: "vehiculoRemolque",
                    attributes: ['id', 'codigoInterno', 'tipoActivo', 'imagen']
                },
                { 
                    model: Activo, 
                    as: "maquinaria",
                    attributes: ['id', 'codigoInterno', 'tipoActivo', 'imagen']
                },

                // 4. Historial de Horas (Opcional, pero útil para ver el detalle)
                { model: HorasTrabajadas }
            ],
        });

        if (!odt) {
            return NextResponse.json({ error: "ODT no encontrada" }, { status: 404 });
        }

        return NextResponse.json(odt);

    } catch (error) {
        console.error("Error obteniendo ODT:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ==========================================
// PUT (Actualización Inteligente)
// ==========================================
export async function PUT(req, { params }) {
  const transaction = await db.sequelize.transaction();
  const { id } = params;

  try {
    const body = await req.json();

    const {
      vehiculoPrincipalId,
      vehiculoRemolqueId,
      maquinariaId,
      choferId,
      ayudanteId,
      ...odtData
    } = body;

    // 1. Verificar existencia
    const odtExistente = await ODT.findByPk(id);
    if (!odtExistente) {
        await transaction.rollback();
        return NextResponse.json({ error: "ODT no encontrada" }, { status: 404 });
    }

    // 2. Actualizar la ODT Principal
    await odtExistente.update({
      ...odtData,
      vehiculoPrincipalId,
      vehiculoRemolqueId,
      maquinariaId,
      choferId,
      ayudanteId
    }, { transaction });

    // Calculamos las horas nuevas
    const horasCalculadas = calcularHoras(odtData.horaLlegada, odtData.horaSalida);

    // 3. Preparar arrays para la sincronización
    
    // --- Personal ---
    const listaPersonal = [];
    if (choferId) listaPersonal.push({ id: choferId, observaciones: `Chofer ODT #${odtExistente.nroODT}` });
    if (ayudanteId) listaPersonal.push({ id: ayudanteId, observaciones: `Ayudante ODT #${odtExistente.nroODT}` });

    await sincronizarRegistros({
      model: HorasTrabajadas,
      fkField: 'empleadoId',
      itemsNuevos: listaPersonal,
      odtId: id,
      datosComunes: { fecha: odtData.fecha, horas: horasCalculadas },
      transaction
    });

    // --- Activos (Horómetros) ---
    const listaActivos = [];
    if (vehiculoPrincipalId) listaActivos.push({ id: vehiculoPrincipalId, observaciones: 'Uso Principal' });
    if (vehiculoRemolqueId) listaActivos.push({ id: vehiculoRemolqueId, observaciones: 'Uso Remolque' });
    if (maquinariaId) listaActivos.push({ id: maquinariaId, observaciones: 'Uso Maquinaria' });

    await sincronizarRegistros({
      model: Horometro,
      fkField: 'activoId',
      itemsNuevos: listaActivos,
      odtId: id,
      datosComunes: { fecha: odtData.fecha, horas: horasCalculadas }, // El helper maneja el nombre del campo 'valor' internamente
      transaction
    });

    await transaction.commit();
    return NextResponse.json(odtExistente);

  } catch (error) {
    console.error("Error en PUT ODT:", error);
    await transaction.rollback();
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