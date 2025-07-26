import { NextResponse } from 'next/server';
import Grupo from '../../../../models/gestionMantenimiento/Grupo';


// GET para obtener todos los grupos
export async function GET() {
  try {
    const grupos = await Grupo.findAll({
      order: [['nombre', 'ASC']],
    });
    return NextResponse.json(grupos);
  } catch (error) {
    console.error('Error al obtener los grupos:', error);
    return NextResponse.json({ message: 'Error al obtener los grupos', error: error.message }, { status: 500 });
  }
}

// POST para crear un nuevo grupo
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, definicion_formulario } = body;

    if (!nombre) {
      return NextResponse.json({ message: 'El nombre del grupo es requerido' }, { status: 400 });
    }

    const nuevoGrupo = await Grupo.create({
      nombre,
      definicion_formulario
    });

    return NextResponse.json(nuevoGrupo, { status: 201 });
  } catch (error) {
     if (error.name === 'SequelizeUniqueConstraintError') {
        return NextResponse.json({ message: 'El nombre del grupo ya existe.' }, { status: 409 });
    }
    console.error('Error al crear el grupo:', error);
    return NextResponse.json({ message: 'Error al crear el grupo', error: error.message }, { status: 500 });
  }
}