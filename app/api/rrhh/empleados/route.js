import { NextResponse } from 'next/server';
import db from '../../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;
    const includePuestos = true; // Opcional para incluir puestos

    const includeOptions = [];
    if (includePuestos) {
      includeOptions.push({
        model: db.Puesto,
        as: 'puestos', // Asegúrate que este alias coincida con tu asociación en Empleado.js
        through: { attributes: [] } // No incluir la tabla intermedia EmpleadoPuesto
      },
      {
        model: db.User,
        as: 'usuario',
        attributes: ['id', 'user'],
      }
    );
    }

    const empleados = await db.Empleado.findAll({
      include: includeOptions,
      order: [['nombre', 'ASC']],
    })
    return NextResponse.json(empleados);
    // const { rows: empleados, count } = await db.Empleado.findAndCountAll({
    //   limit,
    //   offset,
    //   include: includeOptions,
    //   order: [['nombre', 'ASC']],
    // });

    // return NextResponse.json({ total: count, page, limit, data: empleados });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ message: 'Error al obtener empleados', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  // Usamos una transacción para asegurar que o todo se crea, o no se crea nada.
  const transaction = await db.sequelize.transaction();
  try {
    const body = await request.json();
    // 1. Separamos los IDs de los puestos del resto de los datos del empleado.
    const { puestos, ...empleadoData } = body;

    // 2. Creamos el empleado dentro de la transacción.
    const nuevoEmpleado = await db.Empleado.create(empleadoData, { transaction });

    // 3. Si el frontend envió un array de puestosIds, los asociamos.
    if (puestos && puestos.length > 0) {
      // ✨ ¡AQUÍ ESTÁ LA MAGIA! ✨
      // 'addPuestos' es un método que Sequelize añade automáticamente.
      // Su nombre viene del alias 'as: "puestos"' en tu modelo Empleado.
      await nuevoEmpleado.addPuestos(puestos, { transaction });
    }

    // 4. Si todo salió bien, confirmamos la transacción.
    await transaction.commit();

    // 5. Devolvemos el empleado recién creado con sus puestos ya asociados.
    const result = await db.Empleado.findByPk(nuevoEmpleado.id, {
      include: [{
        model: db.Puesto,
        as: 'puestos',
        attributes: ['id', 'nombre'],
        through: { attributes: [] } // Para no incluir la data de la tabla intermedia
      }
      ]
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    // Si algo falla, revertimos todos los cambios.
    await transaction.rollback();
    console.error('Error al crear el empleado:', error);
    return NextResponse.json({
      message: 'Error al crear el empleado',
      error: error.message
    }, { status: 500 });
  }
}