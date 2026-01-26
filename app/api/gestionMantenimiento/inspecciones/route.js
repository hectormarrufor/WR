import { NextResponse } from "next/server";
import db from "@/models"; 

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
      // Guardamos el valor solo si se envió, sino guardamos null (o el anterior si quisieras ser redundante)
      kilometrajeRegistrado: kilometraje || null,
      horometroRegistrado: horometro || null,
      observacionGeneral: observacionGeneral || 'Actualización de contadores',
      origen: origen || 'Rutina',
      activoId,
      usuarioId
    }, { transaction: t });

    // 2. Crear los Hallazgos (SOLO SI EXISTEN)
    if (hallazgos && Array.isArray(hallazgos) && hallazgos.length > 0) {
      const hallazgosData = hallazgos.map(h => ({
        ...h,
        inspeccionId: nuevaInspeccion.id,
        estado: 'Pendiente'
      }));
      await db.Hallazgo.bulkCreate(hallazgosData, { transaction: t });
      
      // Actualizar estado del activo si hay hallazgos críticos
      const hayCritico = hallazgos.some(h => h.impacto === 'No Operativo');
      if (hayCritico) {
        await db.Activo.update({ estado: 'No Operativo' }, { where: { id: activoId }, transaction: t });
      }
    }

    // 3. ACTUALIZACIÓN DE CONTADORES DEL ACTIVO
    const activo = await db.Activo.findByPk(activoId, { 
        include: [
            { model: db.VehiculoInstancia, as: 'vehiculoInstancia' },
            { model: db.MaquinaInstancia, as: 'maquinaInstancia' } // Corregido MaquinaInstancia
        ],
        transaction: t 
    });

    // A. Actualizar Kilometraje (Solo si vino un valor y es un vehículo)
    if (activo.vehiculoInstancia && kilometraje) {
        // Validación extra de backend: No permitir bajar kilometraje (opcional)
        // if (kilometraje > activo.vehiculoInstancia.kilometrajeActual) { ... }
        
        await activo.vehiculoInstancia.update({ 
            kilometrajeActual: kilometraje 
        }, { transaction: t });

        // Registrar en tabla histórica de Kilometraje
        await db.Kilometraje.create({ 
            activoId, 
            valor: kilometraje, 
            fecha_registro: new Date(), 
            origen: 'Inspeccion' // O 'Actualizacion Manual'
        }, { transaction: t });
    } 

    // B. Actualizar Horómetro (Solo si vino un valor y es máquina)
    // Nota: Usamos 'if' separados. Si es un camión con horómetro (raro pero posible), actualiza ambos.
    if (activo.maquinaInstancia && horometro) {
        await activo.maquinaInstancia.update({ 
            horometroActual: horometro 
        }, { transaction: t });

        // Registrar en tabla histórica de Horómetro
        await db.Horometro.create({ 
            activoId, 
            valor: horometro, 
            fecha_registro: new Date(), 
            origen: 'Inspeccion' 
        }, { transaction: t });
    }

    await t.commit();
    return NextResponse.json({ success: true, message: 'Operación registrada con éxito' });

  } catch (error) {
    await t.rollback();
    console.error("Error en POST inspecciones:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}