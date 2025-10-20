import { useAuth } from '@/hooks/useAuth';
import { Stack, Title, UnstyledButton } from '@mantine/core';
import React from 'react'

const NavBar = ({ classes, router }) => {
    const { isAuthenticated, logout, nombre } = useAuth();

    return (
                <Stack mt={120} gap={20} justify='space-between' h="30%" align='center'>
                    {!isAuthenticated && <UnstyledButton className={classes.control} onClick={() => router.push('/')}><Title order={6}>Inicio</Title></UnstyledButton>}
                    {isAuthenticated && <UnstyledButton className={classes.control} onClick={() => router.push('/superuser')}><Title order={6}>Hola, {nombre}</Title></UnstyledButton>}
                    {/* <UnstyledButton className={classes.control} onClick={() => router.push('/stones')}>Nuestros Productos</UnstyledButton> */}
                    {!isAuthenticated ?
                        <UnstyledButton className={classes.control} onClick={() => router.push('/login')}><Title order={6}>Iniciar Sesion</Title></UnstyledButton>
                        :
                        <UnstyledButton className={classes.control} onClick={logout}><Title order={6}>Cerrar sesion</Title></UnstyledButton>
                    }
                    {isAuthenticated &&
                        <UnstyledButton className={classes.control} onClick={() => router.push('/superuser')}><Title order={6}>Panel de administracion</Title></UnstyledButton>
                    }


                    {/* <UnstyledButton className={classes.control} onClick={() => router.push('/drawings')}>Get Instant Estimates</UnstyledButton> */}
                </Stack>

    )
}

export default NavBar