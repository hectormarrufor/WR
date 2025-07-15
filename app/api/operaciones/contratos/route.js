import { NextResponse } from 'next/server';
import db from '../../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeRenglones = searchParams.get('includeRenglones') === 'true';

    const includeOptions = [];
    if (includeRenglones) {
      includeOptions.push({
        model: db.RenglonContrato,
        as: 'renglones',
      });
    }

    const contratos = await db.ContratoServicio.findAll({
      include: includeOptions,
      order: [['fechaInicio', 'DESC']],
    });
    return NextResponse.json(contratos);
  } catch (error) {
    console.error('Error fetching contratos:', error);
    return NextResponse.json({ message: 'Error al obtener contratos', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
 try {
    const { numeroContrato, clienteId, fechaInicio, fechaFinEstimada, estado, montoEstimado, descripcion } = await request.json();

    // Asegúrate de que clienteId es un número si es necesario y de que existe
    if (!clienteId) {
        return NextResponse.json({ message: 'El ID del cliente es requerido.' }, { status: 400 });
    }
    const clienteExistente = await db.Cliente.findByPk(clienteId);
    if (!clienteExistente) {
        return NextResponse.json({ message: 'Cliente no encontrado con el ID proporcionado.' }, { status: 404 });
    }

    const nuevoContrato = await db.ContratoServicio.create({
      numeroContrato,
      clienteId, // <-- Usamos clienteId ahora
      fechaInicio,
      fechaFinEstimada,
      estado,
      montoEstimado,
      descripcion,
    });

    return NextResponse.json(nuevoContrato, { status: 201 });
  } catch (error) {
    console.error('Error al crear contrato de servicio:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return NextResponse.json({ message: 'El número de contrato ya existe.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al crear el contrato de servicio', error: error.message }, { status: 500 });
  }
}