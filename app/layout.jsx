"use client"
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';


import { AppShell, Box, Burger, createTheme, Group, Image, LoadingOverlay, Text, Title, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from './MobileNavbar.module.css';
import React, { useEffect, useState } from 'react';


import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { useRouter, usePathname } from 'next/navigation';
import { theme as themeee } from '../theme';
import "./global.css"
import { useMediaQuery } from '@mantine/hooks';
import { AuthProvider } from '@/hooks/useAuth';
import LayoutMenu from './LayoutMenu';
import NavBar from './NavBar';




export default function RootLayout({ children }) {
  const [showHeader, setShowHeader] = useState(true);

  const theme = createTheme(themeee)
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      setShowHeader(currentY < lastScrollY || currentY < 50);
      lastScrollY = currentY;
    };

    if ("serviceWorker" in navigator) {

      function registerSW() {
          navigator.serviceWorker.getRegistrations().then(regs => {
            if (regs.length === 0) {
              navigator.serviceWorker.register('/sw.js')
                .then(r => console.log('SW registrado tras reinstalación', r))
                .catch(e => console.error('Error al registrar SW', e));
            }
          });
      }
      window.addEventListener('load', registerSW);

      navigator.serviceWorker.ready.then(registration => {
        console.log("✅ PWA listo con scope:", registration.scope);
      });
    }

    if ('PushManager' in window) {
      console.log('✅ Push notifications are supported');
    } else {
      console.log('❌ Push notifications are NOT supported');
    }

    fetch('/api/suscribir') // Ver todas las suscripciones
      .then(response => response.json())
      .then(data => {
        console.log('Suscripciones actuales:', data);
      })
      .catch(error => {
        console.error('Error al obtener suscripciones:', error);
      });




    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);

  }, [])




  // if (isLoading) {
  //   return (
  //     <html>
  //       <body>
  //         <MantineProvider theme={theme} forceColorScheme='light'>
  //           <LoadingOverlay visible={isLoading} zIndex={1005} />
  //         </MantineProvider>
  //       </body>
  //     </html>
  //   )
  // }

  return (
    <html>
      <head>
        <title>Transporte DADICA, C.A</title>
        <link rel="icon" href="/favicon.jpg" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />

      </head>
      <body>



        <MantineProvider theme={theme} forceColorScheme='light'>
          <Notifications />
          <AuthProvider>
            <AppShell
              header={{height: isMobile ? 50 : 66}}
              navbar={{ width: 300, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }}
              padding="md"
            >
              <AppShell.Header
                zIndex={1001}
                height={40}
                bg="#fafafabd"
                style={{
                  position: 'fixed',
                  top: showHeader ? 0 : -80, // se oculta hacia arriba
                  left: 0,
                  right: 0,
                  transition: 'top 0.3s ease-in-out',
                  zIndex: 1000,
                  backdropFilter: 'blur(10px)', // efecto blur
                  WebkitBackdropFilter: 'blur(10px)', // soporte Safari
                }}
              >
                <Group justify='space-between' px={isMobile ? 0 : 40}>
                  <UnstyledButton p={0} m={0} onClick={() => router.push('/')} >
                    <Image src="/logo.png" h={isMobile ? 40 : 55} alt="logo" p={0} py={0} m={5} />
                  </UnstyledButton>
                  <Group h="100%" px="md">
                    <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="md" />
                    <Group justify="space-evenly" style={{ flex: 1 }}>
                      <LayoutMenu classes={classes} router={router} />


                    </Group>
                  </Group>
                </Group>
              </AppShell.Header>
              <AppShell.Navbar py="md" px={4} mt={50} bg="#fafaface"
                style={{
                  backdropFilter: 'blur(10px)', // efecto blur
                  WebkitBackdropFilter: 'blur(10px)', // soporte Safari
                  transition: 'transform 0.3s ease-in-out',
                  transform: opened ? 'translateX(0)' : 'translateX(-100%)',
                  zIndex: 999,
                }}
              >
                <NavBar classes={classes} router={router} />

              </AppShell.Navbar>
              <AppShell.Main
                px={0}
                mt={0}
                mb={0}
                pb={0}
                mx={0}
                style={{ backgroundColor: "#00b4d402" }}
              >
                <Image
                  style={{
                    opacity: 2,
                    position: 'fixed',
                    top: -220,
                    left: 0,
                    zIndex: -1,
                    objectFit: 'cover',
                    height: '150vh',
                  }}
                  src="/fondo.jpg"
                />
                <Box>{children}</Box>
                {/* <InstallationIOSBanner /> */}
              </AppShell.Main>
            </AppShell>
          </AuthProvider>
        </MantineProvider>
        {/* <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then(reg => console.log('Service Worker registrado:', reg))
                  .catch(err => console.error('Error al registrar SW:', err));
              });
            }
          `}
        </Script> */}


      </body>
    </html>

  );
}




