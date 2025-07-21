// app/api/flota/vehiculos/[id]/equipo-especial/route.js
import { NextResponse } from 'next/server';
import db from '../../../../../models';

// --- OBTENER el equipo especial de un vehículo ---
export async function GET(request, { params }) {
  const { id } = params; // El 'id' aquí es el vehiculoId

  try {
    const equipo = await db.EquipoEspecial.findOne({
      where: { vehiculoId: id },
    });

    if (!equipo) {
      return NextResponse.json({ message: 'No se encontró equipo especial para este vehículo' }, { status: 404 });
    }

    return NextResponse.json(equipo);
  } catch (error) {
    console.error('Error al obtener equipo especial:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// --- CREAR un nuevo equipo especial para un vehículo ---
export async function POST(request, { params }) {
  const { id } = params; // vehiculoId
  const body = await request.json();

  try {
    // Verificar que el vehículo exista
    const vehiculo = await db.Vehiculo.findByPk(id);
    if (!vehiculo) {
      return NextResponse.json({ error: 'El vehículo especificado no existe' }, { status: 404 });
    }

    // Verificar que no exista ya un equipo especial para este vehículo
    const existingEquipo = await db.EquipoEspecial.findOne({ where: { vehiculoId: id } });
    if (existingEquipo) {
        return NextResponse.json({ error: 'Este vehículo ya tiene un equipo especial registrado. Use PUT para actualizar.' }, { status: 409 });
    }

    const nuevoEquipo = await db.EquipoEspecial.create({
      ...body,
      vehiculoId: id, // Aseguramos la asociación correcta
    });

    return NextResponse.json(nuevoEquipo, { status: 201 });
  } catch (error) {
    console.error('Error al crear equipo especial:', error);
    // Manejo de errores de validación de Sequelize
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(e => ({ field: e.path, message: e.message }));
      return NextResponse.json({ error: 'Error de validación', details: errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// --- ACTUALIZAR el equipo especial de un vehículo ---
export async function PUT(request, { params }) {
    const { id } = params; // vehiculoId
    const body = await request.json();
  
    try {
      const equipo = await db.EquipoEspecial.findOne({
        where: { vehiculoId: id },
      });
  
      if (!equipo) {
        return NextResponse.json({ error: 'No se encontró equipo especial para este vehículo. Use POST para crearlo.' }, { status: 404 });
      }
  
      await equipo.update(body);
  
      return NextResponse.json(equipo);
    } catch (error) {
        console.error('Error al actualizar equipo especial:', error);
        if (error.name === 'SequelizeValidationError') {
            const errors = error.errors.map(e => ({ field: e.path, message: e.message }));
            return NextResponse.json({ error: 'Error de validación', details: errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
  }