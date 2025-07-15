// app/api/superuser/inventario/consumibles-usados/route.js
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import db from '../../../../../models';


export async function POST(request) {
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    const { consumibleId, cantidadUsada, fechaUso, contratoServicioId, equipoId, empleadoId, notas } = body;

    // 1. Verificar el stock disponible antes de registrar el uso
    const consumible = await db.Consumible.findByPk(consumibleId, { transaction });
    if (!consumible) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Consumible no encontrado.' }, { status: 404 });
    }

    const cantidadRequerida = parseFloat(cantidadUsada);
    if (parseFloat(consumible.stockActual) < cantidadRequerida) {
      await transaction.rollback();
      return NextResponse.json({ message: 'Stock insuficiente para registrar este uso.' }, { status: 400 });
    }

    // 2. Crear el registro de Consumible Usado
    const nuevoConsumibleUsado = await db.ConsumibleUsado.create({
      consumibleId: parseInt(consumibleId),
      cantidadUsada: cantidadRequerida,
      fechaUso: fechaUso,
      contratoServicioId: contratoServicioId ? parseInt(contratoServicioId) : null,
      equipoId: equipoId ? parseInt(equipoId) : null,
      empleadoId: empleadoId ? parseInt(empleadoId) : null,
      notas: notas,
    }, { transaction });

    // 3. Actualizar el stock actual del consumible (disminuir)
    const nuevoStock = parseFloat(consumible.stockActual) - cantidadRequerida;
    await consumible.update({ stockActual: nuevoStock.toFixed(2) }, { transaction });

    await transaction.commit();
    return NextResponse.json(nuevoConsumibleUsado, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Error registrando consumible usado:', error);
    return NextResponse.json({ message: 'Error al registrar consumible usado', error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const consumibleId = searchParams.get('consumibleId');
        const contratoServicioId = searchParams.get('contratoServicioId');
        const equipoId = searchParams.get('equipoId');

        const whereClause = {};
        if (consumibleId) {
          whereClause.consumibleId = consumibleId;
        }
        if (contratoServicioId) {
          whereClause.contratoServicioId = contratoServicioId;
        }
        if (equipoId) {
          whereClause.equipoId = equipoId;
        }

        const consumiblesUsados = await db.ConsumibleUsado.findAll({
            where: whereClause,
            include: [
                { model: db.Consumible, as: 'consumible' },
                { model: db.ContratoServicio, as: 'contratoServicio', include: [{ model: db.Cliente, as: 'cliente' }] }, // Incluye cliente si lo necesitas
                { model: db.Equipo, as: 'equipo' },
                { model: db.Empleado, as: 'empleado' }
            ],
            order: [['fechaUso', 'DESC']],
        });
        return NextResponse.json(consumiblesUsados);
    } catch (error) {
        console.error('Error fetching consumibles usados:', error);
        return NextResponse.json({ message: 'Error al obtener consumibles usados', error: error.message }, { status: 500 });
    }
}