import { NextResponse } from 'next/server';
import CategoriaActivo from '../../../../models/gestionMantenimiento/Categoria';


// GET para obtener todas las categorías
export async function GET() {
  try {
    const categorias = await CategoriaActivo.findAll({
      order: [['nombre', 'ASC']],
    });
    return NextResponse.json(categorias);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener las categorías', error: error.message }, { status: 500 });
  }
}

// POST para crear una nueva categoría (útil para el futuro)
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, grupo, descripcion } = body;

    if (!nombre || !grupo) {
      return NextResponse.json({ message: 'El nombre y el grupo son requeridos' }, { status: 400 });
    }

    const nuevaCategoria = await CategoriaActivo.create(body);
    return NextResponse.json(nuevaCategoria, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al crear la categoría', error: error.message }, { status: 500 });
  }
}