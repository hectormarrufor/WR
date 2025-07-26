"use client"
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { AppShell, Burger, createTheme, Group, Image, LoadingOverlay, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from './MobileNavbar.module.css';
import React, { useEffect, useState } from 'react';


import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { useRouter, usePathname } from 'next/navigation';
import {theme as themeee} from '../theme';
import useUserType from '../hooks/useUserType';
import useAuth from '../hooks/useAuth';
import { cerrarSesion } from './ApiFunctions/userServices';
import useImage from 'use-image';
import Head from 'next/head';
import "./global.css"
import { useMediaQuery } from '@mantine/hooks';
import { useMantineTheme } from '@mantine/core';




export default function RootLayout({ children }) {
  const [showHeader, setShowHeader] = useState(true);

  const theme = createTheme(themeee)
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  // const { userType, isLoading } = useUserType();
  const { isAuthenticated, checkAuth, userType, isLoading } = useAuth();

  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();
  const path = (usePathname());

  useEffect(() => {
    console.log("isAuthenticated: ", isAuthenticated)
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      setShowHeader(currentY < lastScrollY || currentY < 50);
      lastScrollY = currentY;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);

  }, [])
  
  // useEffect(() => {
  //   checkAuth();
  // }, [path])



  if (isLoading) {
    return (
      <html>
        <body>
          <MantineProvider theme={theme} forceColorScheme='light'>
            <LoadingOverlay visible={isLoading} zIndex={1005} />
          </MantineProvider>
        </body>
      </html>
    )
  }

  return (
    <html>
      <head>
        <title>WR Well Services, C.A</title>
        <link rel="icon" href="/favicon.jpg" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body>

        <MantineProvider theme={theme} forceColorScheme='light'>
          <Notifications />

          <AppShell
            header={{}}
            navbar={{ width: 300, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }}
            padding="md"
          >
            <AppShell.Header
              zIndex={1001}
              height={40}
              withBorder={false}
              style={{
                position: 'fixed',
                top: showHeader ? 0 : -80, // se oculta hacia arriba
                left: 0,
                right: 0,
                transition: 'top 0.3s ease-in-out',
                zIndex: 1000,
              }}

            >
              <Group justify="space-between" px={isMobile ? 0 : 100}>
                <Image src="/logo.jpg" height={45} alt="logo" p={0} py={10} m={5} />
                <Group h="100%" px="md">
                  <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="md" />
                  <Group justify="space-evenly" style={{ flex: 1 }}>
                    <Group ml="xl" gap={0} visibleFrom="md">
                      <UnstyledButton className={classes.control} onClick={() => router.push('/')}>Inicio</UnstyledButton>
                      {/* <UnstyledButton className={classes.control} onClick={() => router.push('/stones')}>Nuestros Productos</UnstyledButton> */}
                      {!isAuthenticated ?
                        <UnstyledButton className={classes.control} onClick={() => router.push('/login')}>Iniciar Sesion</UnstyledButton>
                        :
                        <UnstyledButton className={classes.control} onClick={() => cerrarSesion(router.push, checkAuth)}>Cerrar Sesion</UnstyledButton>
                      }
                      {/* {userType === 'admin' &&  */}
                      <UnstyledButton className={classes.control} onClick={() => router.push('/superuser')}>Panel de administrador</UnstyledButton>
                      {/* } */}
                      {/* <UnstyledButton className={classes.control} onClick={() => router.push('/drawings')}>Get Instant Estimates</UnstyledButton> */}
                    </Group>
                  </Group>
                </Group>
              </Group>
            </AppShell.Header>

            <AppShell.Navbar py="md" px={4} mt={80}>
              <UnstyledButton className={classes.control} onClick={() => {
                toggle();
                router.push('/')
              }}>Inicio</UnstyledButton>
              <UnstyledButton className={classes.control} onClick={() => {
                toggle();
                router.push('/superuser')
              }}> Panel de administracion</UnstyledButton>
              <UnstyledButton className={classes.control} onClick={() => {
                toggle();
                router.push('/login')
              }}>Iniciar Sesion</UnstyledButton>
            </AppShell.Navbar>

            <AppShell.Main
              px={0}
              mt={showHeader ? isMobile ? 40 : 50 : 0}
              mx={ isMobile ? 0 : 10}
            >
              {children}
              <Image
                style={{
                  height: 1000,
                  opacity: 0.5,
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  objectFit: 'cover',
                  zIndex: -1,
                }}
                src="https://dycowelldrilling.com/wp-content/uploads/2023/02/a-pumpjack-at-an-oil-drilling-site-at-sunset-2022-03-04-02-28-48-utc-scaled.jpg"
              />
            </AppShell.Main>

          </AppShell>
        </MantineProvider>
      </body>
    </html>

  );
}




