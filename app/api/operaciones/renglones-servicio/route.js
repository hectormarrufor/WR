import { NextResponse } from 'next/server';
import { RenglonContrato, ContratoServicio, Cliente, Mudanza, OperacionCampo } from '../../../../models'; // Asegúrate que esta ruta sea correcta para tus modelos

export async function GET() {
  try {
    const renglones = await RenglonContrato.findAll({
      include: [
        {
          model: ContratoServicio,
          as: 'contrato', // Asegúrate que este alias coincida con tu asociación en RenglonContrato
        //   attributes: ['id', 'numeroContrato', 'montoTotal', 'estado', 'activo'], // Incluye solo los campos necesarios
          include: [
            {
              model: Cliente,
              as: 'cliente', // Asegúrate que este alias coincida con tu asociación en ContratoServicio
              attributes: ['nombreCompleto'],
            },
          ],
        },
        // Opcional: Incluir la última mudanza y operación de campo para mostrar estado rápido
        {
          model: Mudanza,
          as: 'mudanzas', // Asegúrate que este alias coincida
          // attributes: ['fechaInicio', 'fechaFinReal', 'estado'],
          // order: [['fechaInicio', 'DESC']],
          // limit: 1, // Obtener solo la última mudanza
        },
        {
          model: OperacionCampo,
          as: 'operacionesCampo', // Asegúrate que este alias coincida
          // attributes: ['fechaInicio', 'fechaFinReal', 'tiempoTotalEstadia', 'estado'],
          // order: [['fechaInicio', 'DESC']],
          // limit: 1, // Obtener solo la última operación
        },
      ],
      // Puedes añadir un 'where' clause si solo quieres renglones activos, pendientes, etc.
      // where: { estado: ['Pendiente', 'En Preparación', 'Operando'] },
      order: [['createdAt', 'DESC']], // Ordenar por fecha de creación del renglón
    });

    return NextResponse.json(renglones);
  } catch (error) {
    console.error('Error al obtener los renglones de servicio:', error);
    return NextResponse.json({ error: 'Error interno del servidor al obtener los renglones de servicio' }, { status: 500 });
  }
}