'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { desuscribirsePush, suscribirsePush } from '@/app/handlers/push';
import { usePathname } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Esta función ahora se puede llamar desde cualquier lugar
   // Función unificada para verificar sesión
    const fetchUser = async () => {
        try {
            // Llamamos a tu API session (que ahora revisa la BD)
            const response = await fetch('/api/users/session');
            
            if (response.ok) {
                const data = await response.json();
                setUser(data);
                return data;
            } else {
                // SI LA RESPUESTA NO ES OK (Ej: 401 porque borraste el usuario)
                // Ejecutamos logout automático si había un usuario cargado previamente
                if (user) { 
                    console.warn("Sesión invalidada por el servidor");
                    await logout(false); // false = no notificar, o manejar silencioso
                } else {
                    setUser(null);
                }
            }
        } catch (error) {
            console.error("Error fetching session", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // 1. Carga Inicial
    useEffect(() => {
        fetchUser(); 
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
                console.log("suscripcion exitosa");
            } catch (e) {
                console.error('Push subscribe failed', e);
            }
            // Verificar si es chofer
            const esChofer = fetched.puestos?.some(p => p.nombre === 'Chofer');

            if (esChofer) {
                router.push(`/superuser/flota/activos`);
            } else {
                router.push('/superuser');
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
        finally {
            await fetch('/api/users/logout', { method: 'POST' });
            setUser(null);
            router.push('/login');
        }

    };

    return <AuthContext.Provider value={{ 
        imagen: user?.imagen, 
        rol: user?.rol, 
        user: user,
        userId: user?.id, 
        nombre: user?.nombre || "Admin", 
        apellido: user?.apellido || "", 
        isAuthenticated: user?.isAuthenticated ?? false, 
        departamentos: user?.departamentos || [], 
        puestos: user?.puestos || [], 
        isAdmin: user?.isAdmin || null, 
        loading: loading, 
        login, 
        logout, 
        changePassword,
    }}>{children}</AuthContext.Provider>;
}

const changePassword = async ({userId, currentPassword, newPassword }) => {
    try{
        const res = await fetch('/api/users/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                currentPassword,
                newPassword,
            }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);
        else notifications.show({ title: "Contraseña cambiada exitosamente" , color: "green"})

    }
    catch (error) {
        notifications.show({title: "no se pudo cambiar la contraseña", message: error.message})
        return error
    }

}

    export const useAuth = () => {
        const context = useContext(AuthContext);
        if (!context) {
            throw new Error('useAuth debe ser usado dentro de un AuthProvider');
        }
        return context;
    };
