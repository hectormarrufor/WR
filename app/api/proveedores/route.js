// app/api/superuser/proveedores/route.js
import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import db from '../../../models';


export async function POST(request) {
  try {
    const body = await request.json();
    const {
      nombre,
      razonSocial,
      rif,
      direccion,
      telefono,
      email,
      personaContacto,
      telefonoContacto,
      emailContacto,
      notas
    } = body;

    // Validación básica
    if (!nombre || !rif || !telefono) {
      return NextResponse.json({ message: 'Nombre, RIF y teléfono son campos requeridos.' }, { status: 400 });
    }

    // Crear el nuevo proveedor
    const nuevoProveedor = await db.Proveedor.create({
      nombre,
      razonSocial,
      rif,
      direccion,
      telefono,
      email,
      personaContacto,
      telefonoContacto,
      emailContacto,
      notas
    });

    return NextResponse.json(nuevoProveedor, { status: 201 });
  } catch (error) {
    console.error('Error creando proveedor:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return NextResponse.json({ message: 'Ya existe un proveedor con ese RIF.', error: error.message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al crear proveedor', error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query'); // Para búsquedas por nombre, RIF, etc.

    const whereClause = {};
    if (query) {
      whereClause[Op.or] = [
        { nombre: { [Op.like]: `%${query}%` } },
        { razonSocial: { [Op.like]: `%${query}%` } },
        { rif: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { personaContacto: { [Op.like]: `%${query}%` } },
      ];
    }

    const proveedores = await db.Proveedor.findAll({
      where: whereClause,
      order: [['nombre', 'ASC']],
    });
    return NextResponse.json(proveedores);
  } catch (error) {
    console.error('Error fetching proveedores:', error);
    return NextResponse.json({ message: 'Error al obtener proveedores', error: error.message }, { status: 500 });
  }
}