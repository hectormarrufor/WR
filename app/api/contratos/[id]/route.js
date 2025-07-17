import { NextResponse } from 'next/server';
import db from '../../../../models';

export async function GET(request, { params }) {
   const { id } = await params;
  try {
    const contrato = await db.ContratoServicio.findByPk(id, {
      include: [
        {
          model: db.RenglonContrato,
          as: 'renglones', // Asegúrate que este alias coincida con tu asociación en ContratoServicio
        },
        {
          model: db.Cliente,
          as: 'cliente', // Asegúrate que este alias coincida
          // attributes: ['id', 'nombreCompleto', 'razonSocial', 'cedulaRif'],
        }
      ],
    });

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 });
    }

    return NextResponse.json(contrato);
  } catch (error) {
    console.error('Error al obtener contrato:', error);
    return NextResponse.json({ error: 'Error interno del servidor al obtener contrato' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const { renglones, ...contratoData } = await request.json();

  const transaction = await sequelize.transaction(); // Iniciar transacción

  try {
    const contrato = await db.ContratoServicio.findByPk(id, { transaction });

    if (!contrato) {
      await transaction.rollback();
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 });
    }

    // Actualizar los datos principales del contrato
    await contrato.update(contratoData, { transaction });

    // --- Lógica para manejar los renglones ---
    // 1. Obtener los IDs de los renglones que vienen del frontend
    const renglonIdsDelFrontend = renglones.filter(r => r.id).map(r => r.id);

    // 2. Eliminar renglones que existen en DB pero no en el frontend
    // Esto es crucial para manejar renglones que fueron eliminados del formulario
    await db.RenglonContrato.destroy({
      where: {
        contratoServicioId: id,
        id: { [sequelize.Op.notIn]: renglonIdsDelFrontend },
      },
      transaction,
    });

    // 3. Crear o actualizar renglones
    for (const renglon of renglones) {
      if (renglon.id) {
        // Si tiene ID, intenta actualizarlo
        const existingRenglon = await db.RenglonContrato.findByPk(renglon.id, { transaction });
        if (existingRenglon) {
          await existingRenglon.update(renglon, { transaction });
        } else {
          // Si por alguna razón el ID no existe (ej. error), lo creamos
          await db.RenglonContrato.create({ ...renglon, contratoServicioId: id }, { transaction });
        }
      } else {
        // Si no tiene ID, es un nuevo renglón, créalo
        await db.RenglonContrato.create({ ...renglon, contratoServicioId: id }, { transaction });
      }
    }

    await transaction.commit(); // Confirmar la transacción
    return NextResponse.json(contrato, { status: 200 });

  } catch (error) {
    await transaction.rollback(); // Revertir la transacción si hay un error
    console.error(`Error al actualizar contrato ${id}:`, error);
    return NextResponse.json({ error: 'Error interno del servidor al actualizar contrato', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const contrato = await db.ContratoServicio.findByPk(id);
    if (!contrato) {
      return NextResponse.json({ message: 'Contrato no encontrado' }, { status: 404 });
    }
    await contrato.destroy();
    return NextResponse.json({ message: 'Contrato eliminado exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting contrato:', error);
    return NextResponse.json({ message: 'Error al eliminar contrato', error: error.message }, { status: 500 });
  }
}