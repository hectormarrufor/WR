// app/api/odts/[id]/route.js

import { NextResponse } from "next/server";
import db, { ODT, HorasTrabajadas, Horometro, Activo, Empleado, Cliente } from "@/models";
import { Op } from "sequelize";

// ==========================================
// 1. HELPERS (Cálculos y Sincronización)
// ==========================================

// Calcula la diferencia en horas (decimales)
function calcularHoras(horaEntrada, horaSalida) {
  if (!horaEntrada || !horaSalida) return 0;
  
  const [hIn, mIn] = horaEntrada.split(':').map(Number);
  const [hOut, mOut] = horaSalida.split(':').map(Number);

  let entrada = hIn * 60 + mIn;
  let salida = hOut * 60 + mOut;

  // Si cruza la medianoche (Ej: 22:00 a 02:00), sumamos 24h a la salida
  if (salida < entrada) salida += 24 * 60;

  return parseFloat(((salida - entrada) / 60).toFixed(2));
}

// Sincroniza (Upsert/Delete) los registros hijos
async function sincronizarRegistros({ 
  model, 
  fkField, 
  itemsNuevos, 
  odtId, 
  datosComunes, 
  transaction 
}) {
  // 1. Identificar IDs que deben permanecer
  const idsNuevos = itemsNuevos.map(i => i.id).filter(Boolean);

  // 2. BORRAR (Prune): Eliminar lo que ya no está en la lista (ej: cambiaron el chofer)
  await model.destroy({
    where: {
      odtId: odtId,
      origen: 'odt',
      [fkField]: { [Op.notIn]: idsNuevos }
    },
    transaction
  });

  // 3. ACTUALIZAR O CREAR
  for (const item of itemsNuevos) {
    if (!item.id) continue;

    // Lógica Clave: Si el item trae sus propias horas (Personal), úsalas. 
    // Si no (Vehículos), usa las comunes.
    const horasAFijar = item.horasIndividuales !== undefined 
        ? item.horasIndividuales 
        : datosComunes.horas;

    // Buscamos si ya existe el registro
    const registroExistente = await model.findOne({
      where: {
        odtId: odtId,
        origen: 'odt',
        [fkField]: item.id
      },
      transaction
    });

    const camposActualizar = {
      fecha: datosComunes.fecha,
      // Horometro usa 'fecha_registro' y 'valor', HorasTrabajadas usa 'fecha' y 'horas'
      [model === Horometro ? 'fecha_registro' : 'fecha']: datosComunes.fecha,
      [model === Horometro ? 'valor' : 'horas']: horasAFijar,
      observaciones: item.observaciones
    };

    if (registroExistente) {
      await registroExistente.update(camposActualizar, { transaction });
    } else {
      await model.create({
        odtId: odtId,
        [fkField]: item.id,
        origen: 'odt',
        ...camposActualizar
      }, { transaction });
    }
  }
}

// ==========================================
// 2. GET (Obtener ODT con relaciones)
// ==========================================
export async function GET(req, { params }) {
    try {
        const { id } = await params; 

        const odt = await ODT.findByPk(id, {
            include: [
                { model: Cliente, as: "cliente" },
                { model: Empleado, as: "chofer", attributes: ['id', 'nombre', 'apellido', 'imagen'] },
                { model: Empleado, as: "ayudante", attributes: ['id', 'nombre', 'apellido', 'imagen'] },
                { model: Activo, as: "vehiculoPrincipal", attributes: ['id', 'codigoInterno', 'tipoActivo'] },
                { model: Activo, as: "vehiculoRemolque", attributes: ['id', 'codigoInterno', 'tipoActivo'] },
                { model: Activo, as: "maquinaria", attributes: ['id', 'codigoInterno', 'tipoActivo'] },
            ],
        });

        if (!odt) return NextResponse.json({ error: "ODT no encontrada" }, { status: 404 });
        return NextResponse.json(odt);

    } catch (error) {
        console.error("Error GET ODT:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ==========================================
// 3. PUT (Actualización y Cierre de ODT)
// ==========================================
export async function PUT(req, { params }) {
  const transaction = await db.sequelize.transaction();
  const { id } = await params;

  try {
    const body = await req.json();

    // Extraemos campos clave para manejarlos explícitamente
    const {
      vehiculoPrincipalId,
      vehiculoRemolqueId,
      maquinariaId,
      choferId,
      ayudanteId,
      horaLlegada,
      horaSalida,
      choferEntradaBase,
      choferSalidaBase,
      ayudanteEntradaBase,
      ayudanteSalidaBase,
      estado,
      ...odtData // Resto de campos (fecha, nroODT, descripcion...)
    } = body;

    // 1. Verificar existencia
    const odtExistente = await ODT.findByPk(id);
    if (!odtExistente) {
        await transaction.rollback();
        return NextResponse.json({ error: "ODT no encontrada" }, { status: 404 });
    }

    // 2. Validación de Cierre
    // Si intentan poner el estado en 'Finalizada' pero faltan las horas principales
    if (estado === 'Finalizada' && (!horaLlegada || !horaSalida)) {
        await transaction.rollback();
        return NextResponse.json({ error: "No se puede finalizar la ODT sin horas de Llegada y Salida." }, { status: 400 });
    }

    // 3. Actualizar Cabecera de ODT
    await odtExistente.update({
      ...odtData,
      estado,
      horaLlegada,
      horaSalida,
      choferEntradaBase,
      choferSalidaBase,
      ayudanteEntradaBase,
      ayudanteSalidaBase,
      // Actualizamos las relaciones también por si cambiaron el vehículo o chofer
      vehiculoPrincipalId: vehiculoPrincipalId || null,
      vehiculoRemolqueId: vehiculoRemolqueId || null,
      maquinariaId: maquinariaId || null,
      choferId: choferId || null,
      ayudanteId: ayudanteId || null
    }, { transaction });


    // 4. LÓGICA DE TIEMPOS Y NÓMINA
    // Solo generamos registros hijos si hay horas válidas en la ODT
    if (horaLlegada && horaSalida) {
        
        // A. Calcular Horas LABOR (Lo que trabajó la máquina/camión en sitio)
        const horasLaborVehiculos = calcularHoras(horaLlegada, horaSalida);

        // B. Calcular Horas PERSONAL (Base o Labor como fallback)
        
        // Chofer
        const finalChoferEntrada = choferEntradaBase || horaLlegada;
        const finalChoferSalida = choferSalidaBase || horaSalida;
        const horasChofer = calcularHoras(finalChoferEntrada, finalChoferSalida);

        // Ayudante
        const finalAyudanteEntrada = ayudanteEntradaBase || horaLlegada;
        const finalAyudanteSalida = ayudanteSalidaBase || horaSalida;
        const horasAyudante = calcularHoras(finalAyudanteEntrada, finalAyudanteSalida);

        // C. Preparar Listas para Sincronizar

        // --- Lista Personal ---
        const listaPersonal = [];
        if (choferId) {
            listaPersonal.push({ 
                id: choferId, 
                observaciones: `Chofer ODT #${odtExistente.nroODT}`, 
                horasIndividuales: horasChofer // <--- Dato clave
            });
        }
        if (ayudanteId) {
            listaPersonal.push({ 
                id: ayudanteId, 
                observaciones: `Ayudante ODT #${odtExistente.nroODT}`, 
                horasIndividuales: horasAyudante // <--- Dato clave
            });
        }

        // --- Lista Activos ---
        const listaActivos = [];
        if (vehiculoPrincipalId) listaActivos.push({ id: vehiculoPrincipalId, observaciones: 'Uso Principal' });
        if (vehiculoRemolqueId) listaActivos.push({ id: vehiculoRemolqueId, observaciones: 'Uso Remolque' });
        if (maquinariaId) listaActivos.push({ id: maquinariaId, observaciones: 'Uso Maquinaria' });

        // D. Ejecutar Sincronización
        
        // Sync Empleados (HorasTrabajadas)
        await sincronizarRegistros({
            model: HorasTrabajadas,
            fkField: 'empleadoId',
            itemsNuevos: listaPersonal,
            odtId: id,
            datosComunes: { fecha: odtData.fecha }, // No pasamos horas comunes aquí, se usan las individuales
            transaction
        });

        // Sync Activos (Horometro)
        await sincronizarRegistros({
            model: Horometro,
            fkField: 'activoId',
            itemsNuevos: listaActivos,
            odtId: id,
            datosComunes: { fecha: odtData.fecha, horas: horasLaborVehiculos }, // Aquí SÍ hay horas comunes
            transaction
        });

    } else {
        // CASO BORDE: Si el usuario borró las horas para "re-abrir" la ODT, 
        // deberíamos limpiar los registros asociados para que no queden datos fantasma.
        // Esto es opcional, pero recomendado para mantener la consistencia.
        if (estado === 'En Curso') {
             await HorasTrabajadas.destroy({ where: { odtId: id, origen: 'odt' }, transaction });
             await Horometro.destroy({ where: { odtId: id, origen: 'odt' }, transaction });
        }
    }

    await transaction.commit();
    return NextResponse.json(odtExistente);

  } catch (error) {
    console.error("Error PUT ODT:", error);
    await transaction.rollback();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// 4. DELETE (Eliminar ODT)
// ==========================================
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const odt = await ODT.findByPk(id);
    
    if (!odt) return NextResponse.json({ error: "ODT no encontrada" }, { status: 404 });

    // Gracias al "onDelete: CASCADE" en las relaciones, esto borrará 
    // automáticamente los hijos en HorasTrabajadas y Horometro.
    await odt.destroy();
    
    return NextResponse.json({ message: "ODT eliminada correctamente" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}