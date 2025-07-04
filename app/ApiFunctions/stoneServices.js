// clientesService.js
require('dotenv').config();
const API_URL = '/api/stones';


// Obtener todos los clientes (GET)
export async function obtenerPiedras() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Error al obtener piedras: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error en obtenerPiedras:', error);
    throw error;
  }
}

// Obtener un cliente por ID (GET)
export async function obtenerPiedraPorId(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) {
      throw new Error(`Error al obtener piedra ${id}: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Error en obtenerClientePorId (${id}):`, error);
    throw error;
  }
}

// Crear un nuevo cliente (POST)
export async function crearPiedra(stone) {

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({...stone}),
    });

    if (!response.ok) {
      throw new Error(`Error al crear Piedra: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error en crearPiedra:', error);
    throw error;
  }
}


export const getPerfilPiedra = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/clientes/perfil', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  } catch (error) {
    throw error;
  }
};

// Actualizar un cliente (PUT)
export async function actualizarPiedra(id, piedra) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(piedra),
    });

    if (!response.ok) {
      throw new Error(`Error al actualizar piedra ${id}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Error en actualizarPiedra (${id}):`, error);
    throw error;
  }
}

// Eliminar un cliente (DELETE)
export async function eliminarPiedra(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Error al eliminar piedra ${id}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Error en eliminarpiedra (${id}):`, error);
    throw error;
  }
}