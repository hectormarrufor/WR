import User from "../../../../models/user";
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { NextResponse } from "next/server";
import { Error } from "sequelize";

export async function POST(req) {
    try {
        const parsedBody = await req.json(); // Parsea el cuerpo de la solicitud JSON
        const { email, contrasena } = parsedBody;
        console.log(parsedBody)

        const usuario = await User.findOne({ where: { email } });

        if (!usuario) {
            throw new Error('usuario no existe');
        }

        const contrasenaValida = await usuario.comparePassword(contrasena);

        if (!contrasenaValida) {
            console.error("contraseña invalida")
            throw new Error('Credenciales inválidas');
        }

        const token = jwt.sign(
            { id: usuario.id, type: usuario.type},
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        const cookie = serialize('token', token, {
            httpOnly: true, // La cookie no es accesible desde JavaScript
            // secure: process.env.NODE_ENV !== 'development',  Solo se envía a través de HTTPS en producción
            sameSite: 'strict', // Protege contra ataques CSRF
            path: '/', // La cookie es válida para todas las rutas
            maxAge: 60 * 60, // 1 hora (el mismo tiempo que el token)
        });
        return NextResponse.json({ message: 'Inicio de sesión exitoso' }, {
            status: 200,
            headers: { 'Set-Cookie': cookie }, // Establece el encabezado Set-Cookie
        });
    } catch (error) {
        console.error("error al iniciar sesion", error);
        throw error
    }
}
