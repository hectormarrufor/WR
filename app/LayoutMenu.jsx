import { useAuth } from '@/hooks/useAuth';
import { Group, UnstyledButton } from '@mantine/core';
import React, { useEffect } from 'react'
import { cerrarSesion } from './ApiFunctions/userServices';
import { notificar } from './handlers/notificar';

const LayoutMenu = ({ classes, router }) => {
    const { isAuthenticated, logout, nombre } = useAuth();

    return (
        <Group ml="xl" gap={0} visibleFrom="md">
            {!isAuthenticated && <UnstyledButton className={classes.control} onClick={() => router.push('/')}>Inicio</UnstyledButton>}
            {isAuthenticated && <UnstyledButton className={classes.control} onClick={() => router.push('/superuser')}>Hola, {nombre}</UnstyledButton>}
            {/* <UnstyledButton className={classes.control} onClick={() => router.push('/stones')}>Nuestros Productos</UnstyledButton> */}
            {!isAuthenticated ?
                <UnstyledButton className={classes.control} onClick={() => router.push('/login')}>Iniciar Sesion</UnstyledButton>
                :
                <UnstyledButton className={classes.control} onClick={logout}>Cerrar Sesion</UnstyledButton>
            }
            {isAuthenticated &&
                <UnstyledButton className={classes.control} onClick={() => router.push('/superuser')}>Panel de administrador</UnstyledButton>
            }


            {/* <UnstyledButton className={classes.control} onClick={() => router.push('/drawings')}>Get Instant Estimates</UnstyledButton> */}
        </Group>
    )
}

export default LayoutMenu