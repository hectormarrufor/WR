// app/api/users/route.js
import { User } from '@/models';

// GET /api/users - Obtener todos los usuarios
export async function GET() {
  try {
    const usuarios = await User.findAll();
    return Response.json(usuarios, { status: 200 });
  } catch (error) {
    console.log(`\x1b[32m\x1b[41m [ERROR]: Error al obtener usuarios: ${error.message} \x1b[0m`);
    return Response.json({ error:  `Error al obtener usuarios: ${error.message}` }, { status: 500 });
  }
}

// POST /api/users - Crear un nuevo usuario
export async function POST(request) {
  
  try {
    const usuario = await request.json();
    const {user, password, empleadoId, isAdmin} = usuario;
    // Validación básica
    if (!user) {
      console.log(`\x1b[41m [ERROR]: Se reguiere ingresar un usuario \x1b[0m`);
      throw new Error('Usuario es requerido');
    }
    if (!password) {
      console.log(`\x1b[41m [ERROR]: Se reguiere ingresar una contraseña \x1b[0m`);
      throw new Error('Contraseña es requerida');
    }
    if (!empleadoId && !isAdmin) {
      console.log(`\x1b[41m [ERROR]: El id de empleado es requerido \x1b[0m`);
      throw new Error('El empleadoId es requerido');
    }
    let nuevoUsuario = await User.create(usuario);
   
    return Response.json(nuevoUsuario, { status: 201 });
  } catch (error) {
    return Response.json({ error: `Error al crear usuario: ${error}`  }, { status: 500 });
  }
}