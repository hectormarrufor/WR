import { NextResponse } from 'next/server';
import Activo from '../../../../models/gestionMantenimiento/Activo';
import CategoriaActivo from '../../../../models/gestionMantenimiento/CategoriaActivo';


export async function GET(request) {
  try {
    const activos = await Activo.findAll({
      include: [
        { model: CategoriaActivo, as: 'categoria' },
        { model: Activo, as: 'parent' },
        { model: Activo, as: 'children' }
      ],
      order: [['id', 'ASC']]
    });
    return NextResponse.json(activos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener activos', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, codigo, categoriaId, parentId, well_latitude, well_longitude } = body;

    if (!nombre || !codigo || !categoriaId) {
      return NextResponse.json({ message: 'Nombre, código y categoría son requeridos' }, { status: 400 });
    }

    const nuevoActivo = await Activo.create({
      nombre,
      codigo,
      categoriaId,
      parentId,
      well_latitude,
      well_longitude,
    });
    return NextResponse.json(nuevoActivo, { status: 201 });
  } catch (error) {
    console.error(error);
    // Manejo de errores específicos como código duplicado
    if (error.name === 'SequelizeUniqueConstraintError') {
       return NextResponse.json({ message: 'El código de activo ya existe', error: error.message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al crear el activo', error: error.message }, { status: 500 });
  }
}