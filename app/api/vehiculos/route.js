// app/api/vehiculos/route.js
import Vehiculo from '../../../models/vehiculo';

// GET /api/vehiculos - Obtener todos los vehiculos
export async function GET() {
  try {
    const vehiculos = await Vehiculo.findAll();
    return Response.json(vehiculos);
  } catch (error) {
    console.error('Error al obtener vehiculos:', error);
    throw new Error('Error al crear vehiculo: ', error);
  }
}

// POST /api/vehiculos - Crear un nuevo vehiculo
export async function POST(request) {
  
  try {
    const vehiculo = await request.json();

    const newVehiculo = await Vehiculo.create(vehiculo);
    return Response.json(newVehiculo, { status: 201 });
  } catch (error) {
    console.error('Error al crear vehiculo:', error);
    throw new Error('Erro al crear vehiculo: ', error)
  }
}