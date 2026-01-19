// components/AuthGuard.js
'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Center, Loader, Stack, Text } from '@mantine/core'; // Usando Mantine v7

export default function AuthGuard({ children }) {
  const [isChecking, setIsChecking] = useState(true); // Estado de carga inicial
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams(); // Hook para leer ?redirect_to=...

  // Define aquí las rutas que NO necesitan login (públicas)
  const publicPaths = ['/login', '/registro', '/recuperar-clave'];

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Verificar si estamos en una ruta pública
      if (publicPaths.includes(pathname)) {
        setIsChecking(false);
        return;
      }

      // 2. Verificar Credenciales (Ajusta esto a tu lógica real)
      // Supongamos que guardas el token en localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      if (!token) {
        // Si no hay token -> Mandar al Login
        // Guardamos callbackUrl para que el login sepa a dónde volver
        router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        return;
      }

      // 3. LÓGICA DE REDIRECCIÓN DIFERIDA (La parte del Service Worker)
      // Si estamos autenticados, revisamos si el SW nos mandó una orden
      const redirectTo = searchParams.get('redirect_to');

      if (redirectTo) {
        const decodedUrl = decodeURIComponent(redirectTo);
        
        // Verificamos que no estemos ya en esa URL para evitar bucles infinitos
        // Comparación simple: si la URL actual no incluye el destino
        if (!window.location.href.includes(decodedUrl)) {
            console.log('🔄 [AuthGuard] Redirección diferida detectada hacia:', decodedUrl);
            
            // Usamos replace para que el usuario no pueda volver atrás al "cargando"
            router.replace(decodedUrl); 
            return; // Cortamos aquí para esperar la navegación
        }
      }

      // 4. Todo correcto, mostramos la app
      setIsChecking(false);
    };

    checkAuth();
  }, [pathname, searchParams, router]);

  // Renderizado Condicional
  if (isChecking) {
    // Muestra esto mientras se verifica token y se lee el redirect_to
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" type="dots" />
          <Text size="sm" c="dimmed">Iniciando sistema...</Text>
        </Stack>
      </Center>
    );
  }

  // Si ya chequeó y está todo bien, renderiza los hijos (la página real)
  return children;
}