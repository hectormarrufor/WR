import { NextResponse } from 'next/server';
import Inspeccion from '../../../../models/gestionMantenimiento/Inspeccion';
import OrdenTrabajo from '../../../../models/gestionMantenimiento/OrdenTrabajo';
import Activo from '../../../../models/gestionMantenimiento/Activo';
import sequelize from '../../../../sequelize';

export async function POST(request) {
  try {
    const body = await request.json();
    const { activoId, inspectorId, templateId, resultado_general, observaciones_generales, resultados_checklist } = body;

    // Validación básica
    if (!activoId || !inspectorId || !templateId || !resultado_general || !resultados_checklist) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    const result = await sequelize.transaction(async (t) => {
      // 1. Crear la inspección
      const nuevaInspeccion = await Inspeccion.create({ ...body }, { transaction: t });

      // 2. Si el resultado es 'rechazado' o 'con_hallazgos', crear automáticamente una OT
      if (resultado_general === 'rechazado' || resultado_general === 'con_hallazgos') {
        await OrdenTrabajo.create({
          tipo_origen: 'inspeccion',
          origen_id: nuevaInspeccion.id,
          descripcion_falla: `Falla detectada durante inspección. Observaciones: ${observaciones_generales}`,
          prioridad: 'media', // O determinar la prioridad según la gravedad
          activoId: activoId,
          status: 'abierta'
        }, { transaction: t });
        
        // Actualizar el estado del activo
        await Activo.update(
            { status: 'en_mantenimiento' },
            { where: { id: activoId } },
            { transaction: t }
        );
      }
      
      return nuevaInspeccion;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al registrar la inspección', error: error.message }, { status: 500 });
  }
}