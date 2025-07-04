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
import Theme from '../theme';
import useUserType from '../hooks/useUserType';
import useAuth from '../hooks/useAuth';
import { cerrarSesion } from './ApiFunctions/userServices';
import useImage from 'use-image';
import Head from 'next/head';
import "./global.css"



export default function RootLayout({ children }) {
  // const { userType, isLoading } = useUserType();
  const { isAuthenticated, checkAuth, userType, isLoading } = useAuth();

  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();
  const theme = createTheme(Theme)
  const path = (usePathname());

  useEffect(() => {
    console.log("isAuthenticated: ", isAuthenticated)
  }, [])
  useEffect(() => {
    console.log("isAuthenticated: ", isAuthenticated)
  }, [isAuthenticated])
  useEffect(() => {
    checkAuth();
    console.log("path: ", path)
  }, [path])



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
            <AppShell.Header zIndex={1001}>
              <Group justify="space-between" px={100}>
                <Image src="/logo.jpg" height={90} alt="logo" p={10} />
                <Group h="100%" px="md">
                  <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                  <Group justify="space-evenly" style={{ flex: 1 }}>
                    <Group ml="xl" gap={0} visibleFrom="sm">
                      <UnstyledButton className={classes.control} onClick={() => router.push('/')}>Inicio</UnstyledButton>
                      {/* <UnstyledButton className={classes.control} onClick={() => router.push('/stones')}>Nuestros Productos</UnstyledButton> */}
                      {!isAuthenticated ?
                        <UnstyledButton className={classes.control} onClick={() => router.push('/login')}>Iniciar Sesion</UnstyledButton>
                        :
                        <UnstyledButton className={classes.control} onClick={() => cerrarSesion(router.push, checkAuth)}>Cerrar Sesion</UnstyledButton>
                      }
                      {userType === 'admin' && <UnstyledButton className={classes.control} onClick={() => router.push('/superuser')}>Panel de administrador</UnstyledButton>}
                      {/* <UnstyledButton className={classes.control} onClick={() => router.push('/drawings')}>Get Instant Estimates</UnstyledButton> */}
                    </Group>
                  </Group>
                </Group>
              </Group>
            </AppShell.Header>

            <AppShell.Navbar py="md" px={4}>
              <UnstyledButton className={classes.control}>Home</UnstyledButton>
              <UnstyledButton className={classes.control}>Blog</UnstyledButton>
              <UnstyledButton className={classes.control}>Contacts</UnstyledButton>
              <UnstyledButton className={classes.control}>Support</UnstyledButton>
            </AppShell.Navbar>

            <AppShell.Main
              px={0}
            >
              {children}
              {(path == "/") || (path.includes(`/drawings/`)) ? null : <Image
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
              />}
            </AppShell.Main>

          </AppShell>
        </MantineProvider>
      </body>
    </html>

  );
}




