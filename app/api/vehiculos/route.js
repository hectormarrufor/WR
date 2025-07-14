// app/api/vehiculos/route.js
import { NextResponse } from 'next/server';
import  { Vehiculo , FichaTecnica } from '../../../models';

export async function GET() {
  try {
    // Incluir la ficha técnica al buscar vehículos para que esté disponible
    const vehiculos = await Vehiculo.findAll({
      include: [
        {
          model: FichaTecnica,
          as: 'fichaTecnica', // Asegúrate de que 'as' coincide con tu asociación en Vehiculo.associate
        },
      ],
    });
    return NextResponse.json(vehiculos, { status: 200 });
  } catch (error) {
    console.error('Error al obtener vehículos:', error.message);
    return NextResponse.json(
      {
        message: 'Error interno del servidor al obtener vehículos.',
        type: 'ServerError',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // 1. Crear el Vehículo
    const vehiculoData = {
      marca: body.marca,
      modelo: body.modelo,
      imagen: body.imagen,
      placa: body.placa,
      vin: body.vin,
      ano: parseInt(body.ano),
      color: body.color,
      estadoOperativoGeneral: body.estadoOperativoGeneral,
    };
    const nuevoVehiculo = await Vehiculo.create(vehiculoData);
  

    // 2. Crear la Ficha Técnica asociada
    const fichaTecnicaData = {
      ejes: parseInt(body.ejes),
      tipo: body.tipo,
      tipoPeso: body.tipoPeso,
      // Los campos JSONB ya deberían venir como strings JSON del frontend
      correas: body.correas,
      neumaticos: body.neumaticos,
      combustible: body.combustible,
      transmision: body.transmision,
      motor: body.motor,
      carroceria: body.carroceria,
      vehiculoId: nuevoVehiculo.id, // Enlaza con el ID del vehículo recién creado
    };
    await FichaTecnica.create(fichaTecnicaData);

    // 3. Crear el registro de Kilometraje inicial
    if (body.kilometraje !== undefined && body.kilometraje !== null) {
      const kilometrajeData = {
        kilometrajeActual: parseFloat(body.kilometraje), // Asegúrate de que sea un número flotante
        fechaRegistro: new Date(), // O body.fechaInicialKilometraje si la envías
        vehiculoId: nuevoVehiculo.id,
      };
      await Kilometraje.create(kilometrajeData);

    } else {
        console.warn(`Advertencia: No se proporcionó 'kilometraje' para el vehículo ${nuevoVehiculo.id}.`);
        // Considera si quieres lanzar un error o hacer el campo obligatorio.
    }

    // 4. Crear el registro de Horómetro inicial
    if (body.horometro !== undefined && body.horometro !== null) {
      const horometroData = {
        horas: parseFloat(body.horometro), // Asegúrate de que sea un número flotante
        fecha: new Date(), // O body.fechaInicialHorometro si la envías
        vehiculoId: nuevoVehiculo.id,
      };
      await Horometro.create(horometroData);
    } else {
        console.warn(`Advertencia: No se proporcionó 'horometroInicial' para el vehículo ${nuevoVehiculo.id}.`);
        // Considera si quieres lanzar un error o hacer el campo obligatorio.
    }

    // Si todo fue exitoso, responde con el vehículo creado (o un mensaje de éxito)
    return NextResponse.json(
      { message: 'Vehículo y Ficha Técnica registrados exitosamente', vehiculo: nuevoVehiculo },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al registrar vehículo o ficha técnica:', error.message);

    // --- Manejo de errores específicos de Sequelize ---
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path || 'campo desconocido';
      const value = error.errors[0]?.value || 'valor desconocido';
      return NextResponse.json(
        {
          message: `Ya existe un vehículo con el mismo valor en el campo '${field}': ${value}.`,
          type: 'UniqueConstraintError',
          field: field,
          value: value,
        },
        { status: 409 } // 409 Conflict
      );
    } else if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return NextResponse.json(
        {
          message: 'Error de validación en los datos proporcionados para el vehículo o la ficha técnica.',
          type: 'ValidationError',
          errors: validationErrors,
        },
        { status: 400 } // 400 Bad Request
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      return NextResponse.json(
        {
          message: 'Error de relación de datos: el ID asociado no existe o es inválido.',
          type: 'ForeignKeyConstraintError',
        },
        { status: 400 }
      );
    } else {
      // Error genérico del servidor
      return NextResponse.json(
        {
          message: 'Ocurrió un error inesperado en el servidor al registrar el vehículo.',
          type: 'ServerError',
          details: error.message,
        },
        { status: 500 }
      );
    }
  }
}