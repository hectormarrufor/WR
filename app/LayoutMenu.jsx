import { useAuth } from '@/hooks/useAuth';
import { Group, Title, UnstyledButton } from '@mantine/core';
import React, { useEffect } from 'react'
import { cerrarSesion } from './ApiFunctions/userServices';
import { notificar } from './handlers/notificar';

const LayoutMenu = ({ classes, router }) => {
    const { isAuthenticated, logout, nombre } = useAuth();

    return (
        <Group ml="xl" gap={0} visibleFrom="md">
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
        </Group>
    )
}

export default LayoutMenu