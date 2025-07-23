import { NextResponse } from 'next/server';
import { EquipoEspecial, FichaTecnicaEquipoEspecial, TipoEquipoEspecial } from '../../../../models';

// GET: Obtener un equipo especial por su ID
export async function GET(request, { params }) {
  const { id } = await params;

  try {
    const equipo = await EquipoEspecial.findByPk(id, {
      include: [
        {
          model: TipoEquipoEspecial,
          as: 'tipoEquipo',
          attributes: ['nombre']
        },
        {
          model: FichaTecnicaEquipoEspecial,
          as: 'fichaTecnica',
          attributes: ['especificaciones']
        }
      ]
    });

    if (!equipo) {
      return NextResponse.json({ message: 'Equipo especial no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(equipo);
  } catch (error) {
    console.error('Error al obtener equipo especial:', error);
    return NextResponse.json({ message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar un equipo especial por su ID
export async function DELETE(request, { params }) {
    const { id } = await params;
    // Aquí puedes añadir la lógica para eliminar. 
    // Recuerda usar una transacción para eliminar el equipo y su ficha técnica.
    console.log(`Solicitud para eliminar equipo con ID: ${id}`);
    return NextResponse.json({ message: 'Funcionalidad de eliminación pendiente.' }, { status: 501 });
}

// PUT: Actualizar un equipo especial por su ID
export async function PUT(request, { params }) {
    const { id } = await params;
    // Aquí puedes añadir la lógica para actualizar.
    console.log(`Solicitud para actualizar equipo con ID: ${id}`);
    return NextResponse.json({ message: 'Funcionalidad de actualización pendiente.' }, { status: 501 });
}