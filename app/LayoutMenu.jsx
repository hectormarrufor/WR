import { useAuth } from '@/hooks/useAuth';
import { Avatar, Box, Button, Flex, Group, Menu, Title, UnstyledButton } from '@mantine/core';
import { IconKey, IconLogout } from '@tabler/icons-react';
import React, { useState } from 'react'
import ChangePasswordForm from './ChangePasswordForm';

const LayoutMenu = ({ classes, router }) => {
    const { isAuthenticated, logout, nombre, imagen, changePassword, userId } = useAuth();
    const [opened, setOpened] = useState(false);


    if (!isAuthenticated) {
        return (
            <Button variant="light">
                Iniciar sesión
            </Button>
        );
    }


    return (
        <>
            <Group ml="xl" gap={0} visibleFrom="md">
                <Menu shadow="md" width={200} zIndex={2000}>
                    <Menu.Target>
                        <Button variant='subtle'
                            justify="center"
                            p={0}
                            px={10}
                            h={50}
                            align="center"
                        >
                            <Flex justify="center" align="center">
                                <Title order={6}>Hola, {nombre} </Title><Avatar ml={10} h={45} w={45} src={imagen} /><Title order={6}>▼</Title>
                            </Flex>
                        </Button>

                    </Menu.Target>

                    <Menu.Dropdown>
                        <Menu.Item
                            icon={<IconKey size={16} />}
                            onClick={() => setOpened(true)}
                        >
                            Cambiar contraseña
                        </Menu.Item>

                        <Menu.Item
                            icon={<IconLogout size={16} />}
                            onClick={logout}
                        >
                            Cerrar sesión
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>

                <Button
                    variant='subtle'
                    onClick={() => router.push('/superuser')}
                    h={50}
                    >
                        
                    <Title order={6}>Menu principal</Title>
                </Button>



                {/* <UnstyledButton className={classes.control} onClick={() => router.push('/drawings')}>Get Instant Estimates</UnstyledButton> */}
            </Group>
            <ChangePasswordForm
                opened={opened}
                onClose={() => setOpened(false)}
                onSubmit={changePassword}
                userId = {userId}
            />
        </>

    )
}

export default LayoutMenu