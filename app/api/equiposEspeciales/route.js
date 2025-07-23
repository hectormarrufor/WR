import { NextResponse } from 'next/server';
import { EquipoEspecial, FichaTecnicaEquipoEspecial, TipoEquipoEspecial } from '../../../models';
import sequelize from '../../../sequelize';

// POST: Crear un nuevo Equipo Especial
export async function POST(request) {
 // Iniciamos una transacción
  const t = await sequelize.transaction();

  try {
    const body = await request.json();
    const { especificaciones, ...equipoData } = body;

    // 1. Validaciones de los datos del equipo
    const requiredFields = ['tipoEquipo', 'marca', 'modelo', 'identificativo', 'horometro', 'kilometraje'];
    for (const field of requiredFields) {
      if (!equipoData[field]) {
        // Si falla, revertimos la transacción (aunque aquí no se ha hecho nada aún)
        await t.rollback();
        return NextResponse.json({ message: `El campo '${field}' es requerido.` }, { status: 400 });
      }
    }
    
    // 2. Validación del objeto de especificaciones
    if (!especificaciones || typeof especificaciones !== 'object') {
        await t.rollback();
        return NextResponse.json({ message: `El campo 'especificaciones' es requerido y debe ser un objeto.` }, { status: 400 });
    }

    // 3. Creamos el Equipo Especial y su Ficha Técnica asociada en una sola operación
    const nuevoEquipo = await EquipoEspecial.create({
      ...equipoData,
      // Usamos la creación anidada gracias a la asociación definida en models/index.js
      fichaTecnica: { // El alias de la asociación 'as: fichaTecnica'
        especificaciones: especificaciones, // Aquí va el objeto JSONB
      }
    }, {
      // Le decimos a Sequelize que incluya la asociación en la creación
      include: [{
        model: FichaTecnicaEquipoEspecial,
        as: 'fichaTecnica'
      }],
      transaction: t // Le pasamos la transacción
    });

    // Si todo fue bien, confirmamos la transacción
    await t.commit();

    return NextResponse.json(nuevoEquipo, { status: 201 });

  } catch (error) {
    // Si algo falla en cualquier punto, revertimos todos los cambios
    await t.rollback();
    
    console.error('Error al crear equipo especial:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ message: `Error de validación: ${messages}` }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}

// GET: Listar todos los equipos especiales (opcional, pero útil)
export async function GET() {
    try {
        const equipos = await EquipoEspecial.findAll({
            order: [['createdAt', 'DESC']],
             include: [
                {
                    model: TipoEquipoEspecial,
                    as: 'tipoEquipo', // El alias que definiste en la asociación
                    attributes: ['nombre'] // Solo necesitamos el nombre del tipo
                },
                
            ]
        });
        return NextResponse.json(equipos);
    } catch (error) {
        console.error('Error al obtener equipos especiales:', error);
        return NextResponse.json({ message: 'Error al obtener equipos especiales', error: error.message }, { status: 500 });
    }
}