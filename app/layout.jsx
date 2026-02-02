"use client"
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import './global.css'; // Asegúrate de que este archivo exista o quítalo
import 'dayjs/locale/es';

import React, { Suspense, useEffect, useState } from 'react';
import { AppShell, Burger, createTheme, Group, Image, MantineProvider, UnstyledButton, Box, Flex, Center, Loader } from '@mantine/core';
import { useDisclosure, useHeadroom } from '@mantine/hooks'; // useHeadroom es mejor para el header que se esconde
import { Notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { theme as themeConfig } from '../theme'; // Tu archivo de tema
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import LayoutMenu from './LayoutMenu';
import NavBar from './NavBar'; // Tu componente de menú móvil existente
import AuthGuard from '@/hooks/authGuard';
import NotificationBell from './components/NotificationBell';
import { DatesProvider } from '@mantine/dates';

// Crear el tema FUERA del componente para evitar re-renders innecesarios
const theme = createTheme(themeConfig);


// Componente de carga para el Suspense (Puede ser igual al de tu AuthGuard)
function LoadingFallback() {
  return (
    <Center h="100vh">
      <Loader size="lg" type="dots" />
    </Center>
  );
}

export default function RootLayout({ children }) {
  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();

  // Hook nativo de Mantine para detectar scroll y ocultar header (mucho más eficiente)
  const pinned = useHeadroom({ fixedAt: 120 });

  // Registro de Service Worker (PWA) limpio
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('✅ SW Registrado'))
        .catch(err => console.error('❌ Error SW:', err));
    }
    fetch("/api/suscribir").then((res) => {
      res.json().then((data) => {
        console.log("Subscripciones actuales:", data);
      });
    });
  }, []);

  return (
    <html lang="es">
      <head>
        <title>Transporte DADICA, C.A</title>
        <link rel="icon" href="/favicon.jpg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <MantineProvider theme={theme} forceColorScheme='light' withGlobalStyles withNormalizeCSS locale="es">

          <DatesProvider settings={{ locale: 'es' }}>
            <AuthProvider>
              <Suspense fallback={<LoadingFallback />}>
                <AuthGuard>
                
                  <Notifications />
                  <AuthProvider>
                    <AppShell
                      header={{ height: 60, collapsed: !pinned }} // Se oculta automáticamente con el scroll
                      navbar={{
                        width: 300,
                        breakpoint: 'sm',
                        collapsed: { desktop: true, mobile: !opened }, // Solo visible en móvil si está abierto
                      }}
                      padding="md"
                    >
                
                      {/* --- HEADER --- */}
                      <AppShell.Header
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.85)',
                          backdropFilter: 'blur(12px)',
                          borderBottom: '1px solid rgba(0,0,0,0.1)'
                        }}
                      >
                        {/* Usamos justify="space-between" para empujar los elementos a los extremos.
                         En móvil, el logo irá a la izquierda y el Burger a la derecha.
                      */}
                        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
                
                          {/* LADO IZQUIERDO: Logo (Siempre visible) */}
                          <UnstyledButton onClick={() => router.push('/')}>
                            <Image src="/logo.png" h={40} fit="contain" alt="Dadica Logo" />
                          </UnstyledButton>
                
                          {/* LADO DERECHO: Burger (Móvil) o LayoutMenu (Desktop) */}
                          <Group>
                          <NotificationBell />
              
                            <Burger
                              opened={opened}
                              onClick={toggle}
                              hiddenFrom="sm"
                              size="sm"
                            />
                
                            {/* El menú de usuario solo se muestra en Desktop */}
                            <Box visibleFrom="sm">
                              <LayoutMenu router={router} />
                            </Box>
                          </Group>
                
                        </Group>
                      </AppShell.Header>
                
                      {/* --- NAVBAR (Móvil) --- */}
                      <AppShell.Navbar p="md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                        {/* Pasamos 'close={toggle}' para que el menú se cierre al hacer clic */}
                        <NavBar router={router} close={toggle} />
                      </AppShell.Navbar>
                
                      {/* --- MAIN CONTENT --- */}
                      <AppShell.Main p={0} pt={60}>
                        {/* Imagen de fondo fija */}
                        <Box
                          style={{
                
                            position: 'fixed',
                            top: 0, left: 0, width: '100%', height: '100%',
                            zIndex: -1,
                            backgroundImage: 'url(/fondo.jpg)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: 0.3 // Ajusta la opacidad aquí en lugar de en la imagen
                          }}
                        />
                
                        {children}
                      </AppShell.Main>
                
                    </AppShell>
                  </AuthProvider>
                </AuthGuard>
              </Suspense>
            </AuthProvider>
          </DatesProvider>
        </MantineProvider>
      </body>
    </html>
  );
}