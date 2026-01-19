'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Center, Loader, Stack, Text } from '@mantine/core';

export default function AuthGuard({ children }) {
  // Solo mostramos loading si hay una redirección pendiente
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Leemos si el Service Worker nos mandó una orden
    const redirectTo = searchParams.get('redirect_to');

    if (redirectTo) {
        const decodedUrl = decodeURIComponent(redirectTo);
        
        // Evitar bucle si ya estamos ahí
        if (!window.location.href.includes(decodedUrl)) {
            console.log('🔄 [AuthGuard] Ejecutando redirección diferida a:', decodedUrl);
            setIsRedirecting(true);
            
            // Intentamos ir a la ruta protegida.
            // AQUÍ ES LA CLAVE: 
            // - Si la Cookie es válida, el Middleware dejará pasar y cargará la página.
            // - Si la Cookie expiró, el Middleware redirigirá al Login.
            router.replace(decodedUrl);
        }
    }
  }, [searchParams, router]);

  // Si estamos en proceso de redirigir (por orden del SW), mostramos spinner
  if (isRedirecting) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Redirigiendo...</Text>
        </Stack>
      </Center>
    );
  }

  // Si no hay redirección pendiente, renderizamos normal.
  return children;
}