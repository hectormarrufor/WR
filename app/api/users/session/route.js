import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { notificarAdmins, notificarPresidente } from '../../notificar/route';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      console.log(`\x1b[41m No hay token \x1b[0m`);
      return Response.json({ error: 'No token provided' }, { status: 401 });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`\x1b[44m [DEBUG] from: ./api/users/session: [DECODED INFO FROM COOKIE]: ${JSON.stringify(decoded)} \x1b[0m`);
    notificarAdmins({
      title: 'Verificación de sesión',
      body: `${decoded.nombre} ha verificado su sesión`,
      url: '/admin/usuarios',
    });
    notificarPresidente({
      title: 'Este es un mensaje para el presidente',
      body: `EYYYYYY ACORDATE!!!`,
      url: '/admin/usuarios',
    });
    return Response.json({
      rol: decoded.puestos.length > 0 ? decoded.puestos?.map(puesto => puesto.nombre).join(" - ") : decoded.isAdmin ? "admin" : "user", 
      id: decoded.id, 
      imagen: decoded.imagen,
      nombre: decoded.nombre, 
      apellido: decoded.apellido, 
      isAuthenticated: decoded.isAuthenticated, 
      isAdmin: decoded.isAdmin, 
      departamentos: decoded.departamentos.length > 0 ? decoded.departamentos?.map(departamento => departamento.nombre) : [], 
      puestos: decoded.puestos.length > 0 ? decoded.puestos?.map(puesto => puesto.nombre) : []
    }, 
      { status: 200 }
    );
  } catch (error) {
    console.log(`\x1b[41m Error al verificar el token: ${error.message} \x1b[0m`);
    
    console.error('Error al verificar el token:', error.message);
    throw error;
  }
}