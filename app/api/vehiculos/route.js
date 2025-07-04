// app/api/clientes/route.js
import Stone from '../../../models/vehiculoPesado';

// GET /api/clientes - Obtener todos los clientes
export async function GET() {
  try {
    const stones = await Stone.findAll();
    return Response.json(stones);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return Response.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

// POST /api/clientes - Crear un nuevo cliente
export async function POST(request) {
  
  try {
    const stone = await request.json();
    console.log(stone)
    // Validación básica
    if (!stone.name || !stone.width) {
      return Response.json({ error: 'campos son requeridos son requeridos' }, { status: 400 });
    }

    const newStone = await Stone.create(stone);
    return Response.json(newStone, { status: 201 });
  } catch (error) {
    console.error('Error al crear piedra:', error);
    return Response.json({ error: 'Error al crear piedra' }, { status: 500 });
  }
}