import { NextResponse } from 'next/server';
import ListaOpciones from '../../../../models/gestionMantenimiento/ListaOpciones';



// GET para obtener todas las listas de opciones
export async function GET() {
  try {
    const listas = await ListaOpciones.findAll({
      order: [['nombre', 'ASC']],
    });
    // Aseguramos devolver un arreglo, incluso si está vacío
    return NextResponse.json(listas || []);
  } catch (error) {
    console.error('Error al obtener listas de opciones:', error);
    return NextResponse.json({ message: 'Error al obtener listas de opciones', error: error.message }, { status: 500 });
  }
}

// POST para crear una nueva lista de opciones
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, opciones } = body;

    if (!nombre || !opciones || !Array.isArray(opciones)) {
      return NextResponse.json({ message: 'El nombre y un arreglo de opciones son requeridos' }, { status: 400 });
    }

    const nuevaLista = await ListaOpciones.create({
        nombre: nombre.toUpperCase().replace(/\s+/g, '_'),
        opciones
    });
    return NextResponse.json(nuevaLista, { status: 201 });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
        return NextResponse.json({ message: 'El nombre de la lista ya existe.' }, { status: 409 });
    }
    console.error('Error al crear lista de opciones:', error);
    return NextResponse.json({ message: 'Error al crear lista de opciones', error: error.message }, { status: 500 });
  }
}