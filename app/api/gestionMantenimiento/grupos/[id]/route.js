import { NextResponse } from 'next/server';
import Grupo from '../../../../../models/gestionMantenimiento/Grupo';


// GET para obtener un único grupo por su ID
export async function GET(request, { params }) {
  try {
    const grupo = await Grupo.findByPk(params.id);
    if (!grupo) {
      return NextResponse.json({ message: 'Grupo no encontrado' }, { status: 404 });
    }
    return NextResponse.json(grupo);
  } catch (error) {
    console.error('Error al obtener el grupo:', error);
    return NextResponse.json({ message: 'Error al obtener el grupo', error: error.message }, { status: 500 });
  }
}

// PUT para actualizar un grupo existente
export async function PUT(request, { params }) {
  try {
    const grupo = await Grupo.findByPk(params.id);
    if (!grupo) {
      return NextResponse.json({ message: 'Grupo no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    await grupo.update(body);

    return NextResponse.json(grupo);
  } catch (error) {
    console.error('Error al actualizar el grupo:', error);
    return NextResponse.json({ message: 'Error al actualizar el grupo', error: error.message }, { status: 500 });
  }
}