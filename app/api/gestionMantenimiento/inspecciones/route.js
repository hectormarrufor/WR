import { NextResponse } from "next/server";
import db from "@/models"; 
import { notificarCabezas } from '@/app/api/notificar/route'; // 🔥 Motor de Notificaciones

export async function POST(request) {
  const t = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { 
      activoId, 
      usuarioId, 
      kilometraje, // Puede venir null si solo actualizo horas
      horometro,   // Puede venir null si solo actualizo km
      origen, 
      observacionGeneral, 
      hallazgos // Puede venir vacío []
    } = body;

    // 1. Crear el registro de "Inspección" (sirve como log de la actualización)
    const nuevaInspeccion = await db.Inspeccion.create({
      fecha: new Date(),
      kilometrajeRegistrado: kilometraje || null,
      horometroRegistrado: horometro || null,
      observacionGeneral: observacionGeneral || 'Actualización de contadores',
      origen: origen || 'Rutina',
      activoId,
      usuarioId
    }, { transaction: t });

    let tieneFallaCritica = false;
    let tieneAdvertencia = false;

    // 2. Crear los Hallazgos (SOLO SI EXISTEN)
    if (hallazgos && Array.isArray(hallazgos) && hallazgos.length > 0) {
      const hallazgosData = hallazgos.map(h => {
        if (h.impacto === 'No Operativo') tieneFallaCritica = true;
        if (h.impacto === 'Advertencia') tieneAdvertencia = true;

        return {
            ...h,
            inspeccionId: nuevaInspeccion.id,
            estado: 'Pendiente'
        };
      });
      
      await db.Hallazgo.bulkCreate(hallazgosData, { transaction: t });
      
      // Actualizar estado del activo si hay hallazgos críticos
      if (tieneFallaCritica) {
        await db.Activo.update({ estado: 'No Operativo' }, { where: { id: activoId }, transaction: t });
      }
    }

    // 3. ACTUALIZACIÓN DE CONTADORES DEL ACTIVO (Tu lógica original impecable)
    const activo = await db.Activo.findByPk(activoId, { 
        include: [
            { model: db.VehiculoInstancia, as: 'vehiculoInstancia' },
            { model: db.MaquinaInstancia, as: 'maquinaInstancia' } 
        ],
        transaction: t 
    });

    if (!activo) throw new Error("Activo no encontrado");

    // A. Actualizar Kilometraje (Solo si vino un valor y es un vehículo)
    if (activo.vehiculoInstancia && kilometraje) {
        await activo.vehiculoInstancia.update({ 
            kilometrajeActual: kilometraje 
        }, { transaction: t });

        // Registrar en tabla histórica de Kilometraje (Para las gráficas)
        await db.Kilometraje.create({ 
            activoId, 
            valor: kilometraje, 
            fecha_registro: new Date(), 
            origen: 'Inspeccion' 
        }, { transaction: t });
    } 

    // B. Actualizar Horómetro (Solo si vino un valor y es máquina)
    if (activo.maquinaInstancia && horometro) {
        await activo.maquinaInstancia.update({ 
            horometroActual: horometro 
        }, { transaction: t });

        // Registrar en tabla histórica de Horómetro (Para las gráficas)
        await db.Horometro.create({ 
            activoId, 
            valor: horometro, 
            fecha_registro: new Date(), 
            origen: 'Inspeccion' 
        }, { transaction: t });
    }

    // Confirmamos toda la operación en la Base de Datos
    await t.commit();

    // 4. 🔥 DISPARAR NOTIFICACIONES PUSH (NUEVO) 🔥
    // Lo hacemos fuera del commit para que la BD ya tenga los datos guardados
    if (tieneFallaCritica) {
        await notificarCabezas({
            title: `🚨 PARADA DE EQUIPO: ${activo.codigoInterno}`,
            body: `Se reportó una falla CRÍTICA. El equipo ha sido marcado como NO OPERATIVO.`,
            url: `/superuser/flota/activos/${activo.id}`,
            tag: 'falla-critica'
        });
    } else if (tieneAdvertencia) {
        await notificarCabezas({
            title: `⚠️ Advertencia en Equipo: ${activo.codigoInterno}`,
            body: `Se ha reportado una falla leve que requiere revisión en taller.`,
            url: `/superuser/flota/activos/${activo.id}`,
            tag: 'falla-leve'
        });
    }

    return NextResponse.json({ success: true, message: 'Operación registrada con éxito', data: nuevaInspeccion });

  } catch (error) {
    await t.rollback();
    console.error("Error en POST inspecciones:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}