// app/api/clientes/route.js
import Client from '../../../models/user';
import sequelize from '../../../sequelize';

// GET /api/clientes - Obtener todos los clientes
export async function GET() {
  try {
    const clientes = await Client.findAll();
    return Response.json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return Response.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

// POST /api/clientes - Crear un nuevo cliente
export async function POST(request) {
  
  try {
    const cliente = await request.json();
    const {type} = cliente;
    console.log("CLIENTE", cliente)
    // Validación básica
    if (!cliente.email) {
      console.error("se requiere al menos un email")
      throw new Error('Nombre y email son requeridos');
    }
    let nuevoCliente = await Client.create(cliente);
   
    return Response.json(nuevoCliente, { status: 201 });
  } catch (error) {
    return Response.json({ error: `Error al crear cliente: ${error}`  }, { status: 500 });
  }
}