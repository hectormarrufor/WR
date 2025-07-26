import { NextResponse } from 'next/server';
import { Op } from 'sequelize'; // Importar el objeto de operadores de Sequelize
import Activo from '../../../../models/gestionMantenimiento/Activo';
import CategoriaActivo from '../../../../models/gestionMantenimiento/CategoriaActivo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const grupo = searchParams.get('grupo');

    const includeClause = [{
      model: CategoriaActivo,
      as: 'categoria',
      required: true,
    }];

    // --- LÓGICA DE FILTRADO MEJORADA ---
    // Si se proporciona un grupo, buscamos en el arreglo 'grupos' de la categoría.
    if (grupo) {
      includeClause[0].where = {
        grupos: {
          [Op.contains]: [grupo] // Busca si el arreglo contiene el grupo especificado
        }
      };
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
// ... (La función POST no necesita cambios por ahora)