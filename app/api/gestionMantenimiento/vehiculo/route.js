import db from '@/models';
import { NextResponse } from 'next/server';

/**
 * GET para obtener una lista de todos los vehículos (plantillas).
 */
export async function GET(request) {
    try {
        const vehiculos = await db.Vehiculo.findAll({
            include: [
                {
                    model: db.Subsistema,
                    as: 'subsistemas',
                    include: [
                        {
                            model: db.ConsumibleRecomendado,
                            as: 'recomendados',
                            include: [{ model: db.Consumible, as: 'consumible' }]
                        }
                    ]
                }
            ],
            order: [['id', 'ASC']]
        });
        return NextResponse.json(vehiculos);
    } catch (error) {
        console.error('Error al obtener los vehículos:', error);
        return NextResponse.json({ message: 'Error al obtener los vehículos', error: error.message }, { status: 500 });
    }
}

/**
 * POST para crear un nuevo vehículo (plantilla).
 */
import db from '@/models';
import { NextResponse } from 'next/server';

/**
 * POST para crear un nuevo vehículo (plantilla) con sus subsistemas y consumibles recomendados.
 */
export async function POST(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { marca, modelo, anio, subsistemas } = body;

        if (!marca || !modelo) {
            return NextResponse.json({ message: 'La marca y el modelo son requeridos.' }, { status: 400 });
        }

        // 1. Crear vehículo plantilla
        const nuevoVehiculo = await db.Vehiculo.create(
            { marca, modelo, anio },
            { transaction }
        );

        // 2. Crear subsistemas asociados
        if (subsistemas && subsistemas.length > 0) {
            for (const subsistema of subsistemas) {
                const nuevoSubsistema = await db.Subsistema.create(
                    {
                        vehiculoId: nuevoVehiculo.id,
                        nombre: subsistema.nombre
                    },
                    { transaction }
                );

                // 3. Crear consumibles recomendados dentro de cada subsistema
                if (subsistema.recomendados && subsistema.recomendados.length > 0) {
                    for (const recomendado of subsistema.recomendados) {
                        await db.ConsumibleRecomendado.create(
                            {
                                subsistemaId: nuevoSubsistema.id,
                                consumibleId: recomendado.consumibleId, // id del consumible genérico
                                cantidad: recomendado.cantidad,
                                notas: recomendado.notas || null
                            },
                            { transaction }
                        );
                    }
                }
            }
        }

        await transaction.commit();
        return NextResponse.json(nuevoVehiculo, { status: 201 });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al crear el vehículo:', error);
        return NextResponse.json(
            { message: 'Error al crear el vehículo', error: error.message },
            { status: 500 }
        );
    }
}

/**
 * PUT para actualizar un vehículo (plantilla).
 */
export async function PUT(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const body = await request.json();
        const { id, marca, modelo, anio } = body;

        if (!id) {
            return NextResponse.json({ message: 'El ID del vehículo es requerido.' }, { status: 400 });
        }

        const vehiculo = await db.Vehiculo.findByPk(id);
        if (!vehiculo) {
            return NextResponse.json({ message: 'Vehículo no encontrado.' }, { status: 404 });
        }

        await vehiculo.update({ marca, modelo, anio }, { transaction });
        await transaction.commit();
        return NextResponse.json(vehiculo);

    } catch (error) {
        await transaction.rollback();
        console.error('Error al actualizar el vehículo:', error);
        return NextResponse.json({ message: 'Error al actualizar el vehículo', error: error.message }, { status: 500 });
    }
}

/**
 * DELETE para eliminar un vehículo (plantilla).
 */
export async function DELETE(request) {
    const transaction = await db.sequelize.transaction();
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ message: 'El ID del vehículo es requerido.' }, { status: 400 });
        }

        const vehiculo = await db.Vehiculo.findByPk(id);
        if (!vehiculo) {
            return NextResponse.json({ message: 'Vehículo no encontrado.' }, { status: 404 });
        }

        await vehiculo.destroy({ transaction });
        await transaction.commit();
        return NextResponse.json({ message: 'Vehículo eliminado correctamente.' });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al eliminar el vehículo:', error);
        return NextResponse.json({ message: 'Error al eliminar el vehículo', error: error.message }, { status: 500 });
    }
}



VehiculoInstancia.afterCreate(async (instancia, options) => {
  const { Vehiculo, Subsistema, SubsistemaInstancia, ConsumibleRecomendado, Consumible, ConsumibleSerializado } = instancia.sequelize.models;

  // 1. Buscar subsistemas de la plantilla
  const subsistemas = await Subsistema.findAll({
    where: { vehiculoId: instancia.vehiculoId },
    include: [{ model: ConsumibleRecomendado, as: 'recomendados', include: [{ model: Consumible, as: 'consumible' }] }]
  });

  for (const subsistema of subsistemas) {
    // 2. Crear subsistemaInstancia
    const subsistemaInstancia = await SubsistemaInstancia.create({
      vehiculoInstanciaId: instancia.id,
      subsistemaId: subsistema.id,
      nombre: subsistema.nombre
    }, { transaction: options.transaction });

    // 3. Copiar consumibles recomendados
    for (const recomendado of subsistema.recomendados) {
      const consumible = recomendado.consumible;

      if (consumible.tipo === 'fungible') {
        // Asignar cantidad fungible
        await consumible.update({
          stockAlmacen: consumible.stockAlmacen - recomendado.cantidad,
          stockAsignado: consumible.stockAsignado + recomendado.cantidad
        }, { transaction: options.transaction });

        // Registrar asignación fungible
        await instancia.sequelize.models.AsignacionConsumible.create({
          subsistemaInstanciaId: subsistemaInstancia.id,
          consumibleId: consumible.id,
          cantidad: recomendado.cantidad,
          estado: 'instalado'
        }, { transaction: options.transaction });

      } else if (consumible.tipo === 'serializado') {
        // Buscar unidades disponibles
        const unidades = await ConsumibleSerializado.findAll({
          where: { consumibleId: consumible.id, estado: 'almacen' },
          limit: recomendado.cantidad,
          transaction: options.transaction
        });

        for (const unidad of unidades) {
          await unidad.update({
            estado: 'asignado',
            subsistemaInstanciaId: subsistemaInstancia.id,
            activoId: instancia.activoId
          }, { transaction: options.transaction });

          // Registrar asignación serializada
          await instancia.sequelize.models.AsignacionConsumibleSerializado.create({
            subsistemaInstanciaId: subsistemaInstancia.id,
            consumibleSerializadoId: unidad.id,
            estado: 'instalado'
          }, { transaction: options.transaction });
        }
      }
    }
  }
});