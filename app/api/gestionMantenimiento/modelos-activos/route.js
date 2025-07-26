import { NextResponse } from 'next/server';
import ModeloActivo from '../../../../models/gestionMantenimiento/Modelo';
import { CategoriaActivo } from '../../../../models/gestionMantenimiento/CategoriaGrupos';
import sequelize from '../../../../sequelize';

try {
  await sequelize.sync();
} catch (error) {
  console.error('Error al sincronizar la base de datos:', error);
}

// GET para obtener todos los modelos
export async function GET() {
  try {
    const modelos = await ModeloActivo.findAll({
      include: [CategoriaActivo], // Incluir la categoría para mostrarla en la tabla
      order: [['nombre', 'ASC']],
    });
    return NextResponse.json(modelos);
  } catch (error) {
    return NextResponse.json({ message: 'Error al obtener modelos', error: error.message }, { status: 500 });
  }
}

// POST para crear un nuevo modelo
export async function POST(request) {
  try {
    const body = await request.json();
    const nuevoModelo = await ModeloActivo.create(body);
    return NextResponse.json(nuevoModelo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Error al crear el modelo', error: error.message }, { status: 500 });
  }
}