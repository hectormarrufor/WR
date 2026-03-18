import { NextResponse } from "next/server";
import db from "@/models"; 
import { notificarCabezas } from '@/app/api/notificar/route'; // 🔥 Motor de Notificaciones

import { NextResponse } from "next/server";
import db from "@/models"; 
import { notificarCabezas } from '@/app/api/notificar/route';

export async function POST(request) {
  const t = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { activoId, usuarioId, kilometraje, horometro, origen, observacionGeneral, hallazgos } = body;

    // 1. Crear el registro de "Inspección"
    const nuevaInspeccion = await db.Inspeccion.create({
      fecha: new Date(),
      kilometrajeRegistrado: kilometraje || null,
      horometroRegistrado: horometro || null,
      observacionGeneral: observacionGeneral || 'Actualización de contadores',
      origen: origen || 'Rutina',
      activoId,
      usuarioId
    }, { transaction: t });

    let tieneFallaCriticaActual = false;
    let tieneAdvertenciaActual = false;

    // 2. Crear los Hallazgos de esta inspección
    if (hallazgos && Array.isArray(hallazgos) && hallazgos.length > 0) {
      const hallazgosData = hallazgos.map(h => {
        if (h.impacto === 'No Operativo') tieneFallaCriticaActual = true;
        if (h.impacto === 'Advertencia') tieneAdvertenciaActual = true;

        return { ...h, inspeccionId: nuevaInspeccion.id, estado: 'Pendiente' };
      });
      
      await db.Hallazgo.bulkCreate(hallazgosData, { transaction: t });
      // 🔥 Ya no actualizamos el estado aquí a lo bruto. Dejamos que el Semáforo decida abajo.
    }

    // 3. ACTUALIZACIÓN DE CONTADORES DEL ACTIVO
    const activo = await db.Activo.findByPk(activoId, { 
        include: [
            { model: db.VehiculoInstancia, as: 'vehiculoInstancia' },
            { model: db.MaquinaInstancia, as: 'maquinaInstancia' } 
        ],
        transaction: t 
    });

    if (!activo) throw new Error("Activo no encontrado");

    if (activo.vehiculoInstancia && kilometraje) {
        await activo.vehiculoInstancia.update({ kilometrajeActual: kilometraje }, { transaction: t });
        await db.Kilometraje.create({ activoId, valor: kilometraje, fecha_registro: new Date(), origen: 'Inspeccion' }, { transaction: t });
    } 

    if (activo.maquinaInstancia && horometro) {
        await activo.maquinaInstancia.update({ horometroActual: horometro }, { transaction: t });
        await db.Horometro.create({ activoId, valor: horometro, fecha_registro: new Date(), origen: 'Inspeccion' }, { transaction: t });
    }

    // 4. 🔥 SEMÁFORO DE SALUD (HEALTH CHECK INTEGRAL) 🔥
    let estadoFinal = activo.estado;

    if (activo.horasAnuales !== undefined && Number(activo.horasAnuales) <= 0) {
        estadoFinal = 'Inactivo';
    } else if (activo.estado !== 'Desincorporado') {
        
        // A. Órdenes en progreso
        const ordenesAbiertas = await db.OrdenMantenimiento.count({
            where: { activoId: activo.id, estado: 'En Progreso' },
            transaction: t
        });

        // B. Estado de Subsistemas Físicos
        const subsistemas = await db.SubsistemaInstancia.findAll({ where: { activoId: activo.id }, transaction: t });
        const tienePiezaCritica = subsistemas.some(s => ['roto', 'critico', 'no operativo'].includes(s.estado?.toLowerCase()));
        const tienePiezaLeve = subsistemas.some(s => ['advertencia', 'regular', 'desgaste'].includes(s.estado?.toLowerCase()));

        // C. Hallazgos Pendientes (Buscamos en TODAS las inspecciones de este activo)
        const inspeccionesDelActivo = await db.Inspeccion.findAll({ where: { activoId: activo.id }, attributes: ['id'], transaction: t });
        const inspeccionIds = inspeccionesDelActivo.map(i => i.id);
        
        const hallazgosPendientes = await db.Hallazgo.findAll({
            where: { inspeccionId: inspeccionIds, estado: 'Pendiente' },
            transaction: t
        });
        
        const tieneHallazgoCritico = hallazgosPendientes.some(h => h.impacto === 'No Operativo');
        const tieneHallazgoLeve = hallazgosPendientes.some(h => h.impacto === 'Advertencia');

        // D. Jerarquía del Semáforo
        if (ordenesAbiertas > 0) {
            estadoFinal = 'En Mantenimiento';
        } else if (tienePiezaCritica || tieneHallazgoCritico) {
            estadoFinal = 'No Operativo';
        } else if (tienePiezaLeve || tieneHallazgoLeve) {
            estadoFinal = 'Advertencia';
        } else {
            estadoFinal = 'Operativo';
        }
    }

    // Aplicar el estado calculado
    if (estadoFinal !== activo.estado) {
        await activo.update({ estado: estadoFinal }, { transaction: t });
    }

    await t.commit();

    // 5. 🔥 DISPARAR NOTIFICACIONES PUSH 🔥
    if (tieneFallaCriticaActual) {
        await notificarCabezas({
            title: `🚨 PARADA DE EQUIPO: ${activo.codigoInterno}`,
            body: `Se reportó una falla CRÍTICA. El equipo ha pasado a NO OPERATIVO.`,
            url: `/superuser/flota/activos/${activo.id}`,
            tag: 'falla-critica'
        });
    } else if (tieneAdvertenciaActual) {
        await notificarCabezas({
            title: `⚠️ Advertencia en Equipo: ${activo.codigoInterno}`,
            body: `Se ha reportado una falla leve que requiere revisión en taller.`,
            url: `/superuser/flota/activos/${activo.id}`,
            tag: 'falla-leve'
        });
    }

    return NextResponse.json({ success: true, message: 'Inspección procesada con estado actualizado', data: nuevaInspeccion });

  } catch (error) {
    await t.rollback();
    console.error("Error en POST inspecciones:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}