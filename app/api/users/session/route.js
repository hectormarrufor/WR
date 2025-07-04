import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const cookieStore =  await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return Response.json({ authenticated: true, type: decoded.type }, { status: 200 });
  } catch (error) {
    console.error('Error al verificar el token:', error);
    throw error;
  }
}