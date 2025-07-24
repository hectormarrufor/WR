import { NextResponse } from 'next/server';
import OrdenTrabajo from '../../../../models/gestionMantenimiento/OrdenTrabajo';
import Activo from '../../../../models/gestionMantenimiento/Activo';
import sequelize from '../../../../sequelize';


export async function POST(request) {
  try {
    const body = await request.json();
    const { tipo_origen, descripcion_falla, prioridad, activoId } = body;

    if (!tipo_origen || !descripcion_falla || !prioridad || !activoId) {
      return NextResponse.json({ message: 'Todos los campos son requeridos' }, { status: 400 });
    }
    
    // Inicia una transacción para asegurar la consistencia de los datos
    const result = await sequelize.transaction(async (t) => {
      const nuevaOrden = await OrdenTrabajo.create({
        tipo_origen,
        descripcion_falla,
        prioridad,
        activoId,
      }, { transaction: t });

      // Actualiza el estado del activo a "en_mantenimiento"
      await Activo.update(
        { status: 'en_mantenimiento' },
        { where: { id: activoId } },
        { transaction: t }
      );

      return nuevaOrden;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
     console.error(error);
     return NextResponse.json({ message: 'Error al crear la orden de trabajo', error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
    try {
        const ordenes = await OrdenTrabajo.findAll({
            include: [{ model: Activo, as: 'activo' }],
            order: [['createdAt', 'DESC']]
        });
        return NextResponse.json(ordenes);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error al obtener las órdenes de trabajo', error: error.message }, { status: 500 });
    }
}