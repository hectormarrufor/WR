import { serialize } from 'cookie';

export async function POST(request) {
  // Elimina la cookie
  const cookie = serialize('token', '', {
    httpOnly: true,
    // secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    path: '/',
    maxAge: 0, // Establece maxAge a 0 para eliminar la cookie
  });

  return new Response(JSON.stringify({ message: 'Sesión cerrada exitosamente' }), {
    status: 200,
    headers: { 'Set-Cookie': cookie },
  });
}