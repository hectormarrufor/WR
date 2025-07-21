// app/api/vehiculos/[id]/route.js
import { NextResponse } from 'next/server';
import { Vehiculo, FichaTecnica, EstadoSistemaVehiculo, Inspeccion, HallazgoInspeccion, Kilometraje, Horometro, Mantenimiento, TareaMantenimiento, ConsumibleUsado, Consumible } from '../../../../models';

// GET un vehículo por ID
export async function GET(request, { params }) {
  const { id } = await params; // Obtiene el ID de los parámetros de la URL

  try {
    const vehiculo = await Vehiculo.findByPk(id, {
      include: [
        {
          model: FichaTecnica,
          as: 'fichaTecnica',
        },
        {
          model: Kilometraje,
          as: 'kilometrajes', // Asegúrate que 'as' coincide con tu asociación en Vehiculo
          order: [['fechaRegistro', 'DESC']], // Ordenar para obtener el más reciente primero
          limit: 1, // Limitar a 1 para obtener solo el más reciente
          required: false, // No requiere que haya kilometrajes para traer el vehículo
        },
        // Incluir la última entrada de Horometro
        {
          model: Horometro,
          as: 'horometros', // Asegúrate que 'as' coincide con tu asociación en Vehiculo
          order: [['fecha', 'DESC']], // Ordenar para obtener el más reciente primero
          limit: 1, // Limitar a 1 para obtener solo el más reciente
          required: false,
        },
        // Incluir mantenimientos y sus tareas anidadas
        {
          model: Mantenimiento,
          as: 'mantenimientos', // Asegúrate que 'as' coincide con tu asociación en Vehiculo
          required: false,
          include: [
            {
              model: TareaMantenimiento,
              as: 'tareas', // Asegúrate que 'as' coincide con tu asociación en Mantenimiento
              required: false,
              include: [
                {
                  model: ConsumibleUsado, // El modelo de la tabla intermedia (si tiene atributos)
                  as: 'consumiblesUsados', // El alias de la asociación en Mantenimiento
                  required: false,
                  include: {
                    model: Consumible, // El modelo del consumible real
                    as: 'consumible', // El alias de la asociación en ConsumibleUsado
                    required: false,
                  }
                },
              ]
            },
            // Si tienes Consumible y ConsumibleUsado, inclúyelos aquí:
            // Opción 1: Si ConsumibleUsado es una tabla intermedia con datos adicionales
            // Opción 2: Si Consumible es directamente una asociación Many-to-Many simple
            /*
            {
              model: Consumible,
              as: 'consumibles', // El alias que usaste en Mantenimiento.belongsToMany(Consumible)
              through: {
                attributes: [] // No queremos los atributos de la tabla intermedia si no son relevantes
              },
              required: false,
            },
            */
          ],
          order: [['fechaRealizacion', 'DESC']], // Ordenar mantenimientos por fecha más reciente
        },
        // Incluir inspecciones y sus hallazgos, como ya lo tienes
        {
          model: Inspeccion,
          as: 'inspecciones',
          include: [
            {
              model: HallazgoInspeccion,
              as: 'hallazgos',
              required: false,
            },
          ],
          order: [['fechaInspeccion', 'DESC']], // Obtener las inspecciones más recientes primero
          required: false,
        },
        // Si necesitas los EstadoSistemaVehiculo directamente, no desde la inspección
        // {
        //   model: EstadoSistemaVehiculo,
        //   as: 'estadosSistemas', // Ajusta este alias si es diferente
        //   order: [['fechaActualizacion', 'DESC']],
        //   required: false,
        // }
      ],
    });

    if (!vehiculo) {
      console.error('no se consiguio ningun vehiculo')
      return NextResponse.json(
        { message: 'Vehículo no encontrado.', type: 'NotFound' },
        { status: 404 }
      );
    }

    return NextResponse.json(vehiculo, { status: 200 });
  } catch (error) {
    console.error(`Error al obtener vehículo con ID ${id}:`, error.message);
    return NextResponse.json(
      {
        message: 'Error interno del servidor al obtener vehículo.',
        type: 'ServerError',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT (Actualizar) un vehículo por ID
export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const vehiculo = await Vehiculo.findByPk(id);

    if (!vehiculo) {
      return NextResponse.json(
        { message: 'Vehículo no encontrado.', type: 'NotFound' },
        { status: 404 }
      );
    }

    // Actualiza los campos, convirtiendo a número donde sea necesario
    const updatedVehiculoData = {
      marca: body.marca,
      modelo: body.modelo,
      placa: body.placa,
      vin: body.vin,
      ano: parseInt(body.ano),
      color: body.color,
      kilometraje: parseInt(body.kilometraje),
      horometro: parseInt(body.horometro),
      imagen: body.imagen,
      estadoOperativoGeneral: body.estadoOperativoGeneral,
    };

    await vehiculo.update(updatedVehiculoData);

    // Si también se actualiza la ficha técnica, necesitarías una lógica similar
    // o una ruta PUT separada para la ficha técnica
    if (body.fichaTecnica) {
      const fichaTecnica = await FichaTecnica.findOne({ where: { vehiculoId: id } });
      if (fichaTecnica) {
        const updatedFichaTecnicaData = {
          ejes: parseInt(body.fichaTecnica.ejes),
          tipo: body.fichaTecnica.tipo,
          tipoPeso: body.fichaTecnica.tipoPeso,
          tipoCombustible: body.fichaTecnica.tipoCombustible,
          correas: body.fichaTecnica.correas,
          neumaticos: body.fichaTecnica.neumaticos,
          combustible: body.fichaTecnica.combustible,
          transmision: body.fichaTecnica.transmision,
          motor: body.fichaTecnica.motor,
          carroceria: body.fichaTecnica.carroceria,
        };
        await fichaTecnica.update(updatedFichaTecnicaData);
      }
    }


    return NextResponse.json(
      { message: 'Vehículo actualizado exitosamente.', vehiculo: vehiculo },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error al actualizar vehículo con ID ${id}:`, error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path || 'campo desconocido';
      const value = error.errors[0]?.value || 'valor desconocido';
      return NextResponse.json(
        {
          message: `Ya existe un registro con el mismo valor en el campo '${field}': ${value}.`,
          type: 'UniqueConstraintError',
          field: field,
          value: value,
        },
        { status: 409 }
      );
    } else if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return NextResponse.json(
        {
          message: 'Error de validación en los datos proporcionados.',
          type: 'ValidationError',
          errors: validationErrors,
        },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        {
          message: 'Error interno del servidor al actualizar vehículo.',
          type: 'ServerError',
          details: error.message,
        },
        { status: 500 }
      );
    }
  }
}

// DELETE un vehículo por ID
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const vehiculo = await Vehiculo.findByPk(id);

    if (!vehiculo) {
      return NextResponse.json(
        { message: 'Vehículo no encontrado.', type: 'NotFound' },
        { status: 404 }
      );
    }

    await vehiculo.destroy();
    return NextResponse.json(
      { message: 'Vehículo eliminado exitosamente.' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error al eliminar vehículo con ID ${id}:`, error.message);
    return NextResponse.json(
      {
        message: 'Error interno del servidor al eliminar vehículo.',
        type: 'ServerError',
        details: error.message,
      },
      { status: 500 }
    );
  }
}