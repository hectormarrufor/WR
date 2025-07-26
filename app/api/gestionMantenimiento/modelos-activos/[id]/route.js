import { NextResponse } from 'next/server';
import ModeloActivo from '../../../../../models/gestionMantenimiento/ModeloActivo';
import { CategoriaActivo, Grupo } from '../../../../../models/gestionMantenimiento/CategoriaGrupo';
import sequelize from '../../../../../sequelize';

// GET para un solo modelo (con todo el detalle necesario para el formulario)
export async function GET(request, { params }) {
  try {
    const modelo = await ModeloActivo.findByPk(params.id, {
      include: [{
        model: CategoriaActivo,
        include: [{
          model: Grupo,
          as: 'grupos',
          through: { attributes: [] }
        }]
      }]
    });
    if (!modelo) {
      return NextResponse.json({ message: 'Modelo no encontrado' }, { status: 404 });
    }
    return NextResponse.json(modelo);
  } catch (error) {
    return NextResponse.json({ message: 'Error al obtener el modelo', error: error.message }, { status: 500 });
  }
}

// PUT para actualizar un modelo
export async function PUT(request, { params }) {
    try {
        const modelo = await ModeloActivo.findByPk(params.id);
        if (!modelo) {
            return NextResponse.json({ message: 'Modelo no encontrado' }, { status: 404 });
        }
        const body = await request.json();
        await modelo.update(body);
        return NextResponse.json(modelo);
    } catch (error) {
        return NextResponse.json({ message: 'Error al actualizar el modelo', error: error.message }, { status: 500 });
    }
}