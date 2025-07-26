import { NextResponse } from 'next/server';
import Activo from '../../../models/gestionMantenimiento/Activo';
import CategoriaActivo from '../../../models/gestionMantenimiento/Categoria';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const grupo = searchParams.get('grupo'); // Capturamos el parámetro 'grupo'

    let whereClause = {};
    const includeClause = [{
      model: CategoriaActivo,
      as: 'categoria',
      required: true, // Hacemos un INNER JOIN para asegurar que tenga categoría
    }];

    // Si se proporciona un grupo, lo añadimos al 'where' de la categoría
    if (grupo) {
      includeClause[0].where = { grupo };
    }

    const activos = await Activo.findAll({
      include: includeClause,
      order: [['id', 'ASC']]
    });

    return NextResponse.json(activos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener activos', error: error.message }, { status: 500 });
  }
}

// La función POST se mantiene igual...
export async function POST(request) {
    // ... (código existente)
}