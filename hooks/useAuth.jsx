'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { desuscribirsePush, suscribirsePush } from '@/app/handlers/push';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Esta función ahora se puede llamar desde cualquier lugar
    const fetchUser = async () => {
        console.log(`\x1b[32m FETCHING USER \x1b[0m`);

        try {
            const response = await fetch('/api/users/session');
            if (response.ok) {
                const data = await response.json();
                console.log(`\x1b[44m [DEBUG] DATA FETCHED FROM AuthProvider: ${JSON.stringify(data)} \x1b[0m`);

                setUser(data);
                return data;
            } else {
                setUser(null);
            }
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser(); // Verificar sesión al cargar la app
    }, []);

    // ✨ NUEVA FUNCIÓN DE LOGIN ✨
    const login = async (user, password) => {
        setLoading(true);
        try {

            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al iniciar sesión');
            }

            // Si el login fue exitoso, volvemos a buscar los datos del usuario.
            notifications.show({
                title: 'Inicio de sesión exitoso',
                message: 'Bienvenido de nuevo',
                color: 'green',
            });
            setLoading(false);
            // Esto actualizará el estado y re-renderizará todo automáticamente.
            const fetched = await fetchUser();

            try {
                await suscribirsePush(fetched);
            } catch (e) {
                console.error('Push subscribe failed', e);
            }

            router.push('/superuser'); // Redirige al dashboard
        } catch (error) {
            setLoading(false);
            throw error; // Lanza el error para que el formulario de login lo muestre
        }
    };

    // ✨ NUEVA FUNCIÓN DE LOGOUT ✨
    const logout = async () => {
        console.log("voy a cerrar sesion")
        try {
            await desuscribirsePush(); // ya maneja todo internamente
            console.log("desuscripcion exitosa")
        } catch (e) {
            console.error('Unsubscribe failed', e);
        }

        await fetch('/api/users/logout', { method: 'POST' });
        setUser(null);
        router.push('/login');
    };

    return <AuthContext.Provider value={{ userId: user?.id, nombre: user?.nombre, apellido: user?.apellido, isAuthenticated: user?.isAuthenticated || null, departamentos: user?.departamentos || [], puestos: user?.puestos || [], isAdmin: user?.isAdmin || null, loading: loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
