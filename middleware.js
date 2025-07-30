import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Este middleware se ejecuta en el Edge Runtime para máxima velocidad.
 * Utiliza 'jose' que es compatible con este entorno.
 */
export async function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('token')?.value;
    const loginUrl = new URL('/login', request.url);

    if (!token) {
        return NextResponse.redirect(loginUrl);
    }

    try {
        // ✨ LA LÓGICA CLAVE CON 'jose' ✨
        // 1. Convertimos la clave secreta al formato que 'jose' requiere.
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);

        // 2. Verificamos el token. jwtVerify de 'jose' es asíncrono.
        const { payload } = await jwtVerify(token, secret);

        // 3. Comprobamos si el payload tiene la propiedad 'isAuthenticated'.
        if (payload && payload.isAuthenticated) {
            // Si está autenticado, lo dejamos pasar.
            return NextResponse.next();
        } else {
            // Si no, lo redirigimos al login.
            return NextResponse.redirect(loginUrl);
        }

    } catch (error) {
        console.error('Error de autenticación en middleware:', error.message);
        
        // Limpiamos la cookie inválida y redirigimos.
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('token');
        return response;
    }
}

export const config = {
    matcher: ['/superuser/:path*'],
};