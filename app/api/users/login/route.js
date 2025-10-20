import User from "../../../../models/user";
import webpush from 'web-push';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { NextResponse } from "next/server";
import { Error } from "sequelize";
import { Departamento, Empleado, Puesto } from "@/models";

webpush.setVapidDetails(
    'mailto:admin@tuapp.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

const admins = await db.PushSubscription.findAll({ where: { rol: 'admin', activo: true } });

export async function POST(req) {
    try {
        const parsedBody = await req.json(); // Parsea el cuerpo de la solicitud JSON
        const { user, password } = parsedBody;
        const usuario = await User.findOne({ where: { user }, include: [{ model: Empleado, as: 'empleado', include: [{ model: Puesto, as: 'puestos', attributes: ['nombre'], include: [{ model: Departamento, as: 'departamento', attributes: ['nombre'] }] }] }] });
        if (!usuario) {
            throw new Error('usuario no existe');
        }

        const contrasenaValida = await usuario.comparePassword(password);

        if (!contrasenaValida) {
            console.error("contraseña invalida")
            throw new Error('Credenciales inválidas');
        }
        console.log("usuario encontrado", usuario);

        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.empleado?.nombre || "Admin", departamentos: usuario.empleado?.puestos.map(puesto => puesto.departamento) || "", isAdmin: usuario.isAdmin, puestos: usuario.empleado?.puestos || "", isAuthenticated: true },
            process.env.JWT_SECRET,
            { expiresIn: '1y' }
        );
        const cookie = serialize('token', token, {
            httpOnly: true, // La cookie no es accesible desde JavaScript
            // secure: process.env.NODE_ENV !== 'development',  Solo se envía a través de HTTPS en producción
            sameSite: 'strict', // Protege contra ataques CSRF
            path: '/', // La cookie es válida para todas las rutas
            maxAge: 60 * 60 * 24 * 365 // 1 año
        });
        for (const a of admins) {
            try {
                await webpush.sendNotification(a.get({ plain: true }), JSON.stringify({
                    title: 'Un usuario inicio sesión',
                    body: `El usuario ${usuario.empleado?.nombre || "Admin"} ha iniciado sesión.`,
                    icon: '/icons/icon-192x192.png',
                    url: '/superuser'
                }));
            } catch (err) {
                console.error('Push send error', err);
                // Si el error indica suscripción inválida elimina o marca inactiva
                await db.PushSubscription.update({ activo: false }, { where: { endpoint: a.endpoint } });
            }
        }

        return NextResponse.json({ message: 'Inicio de sesión exitoso' }, {
            status: 200,
            headers: { 'Set-Cookie': cookie }, // Establece el encabezado Set-Cookie
        });
    } catch (error) {
        console.log(`\x1b[41m [ERROR]: Error al iniciar sesion: ${error.message} \x1b[0m`);
        return NextResponse.json(
            { message: error.message || 'Error al iniciar sesión' },
            { status: 401 }
        );

    }
}
