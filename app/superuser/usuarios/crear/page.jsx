'use client'
import React, { useEffect, useState } from 'react';
import { useForm } from '@mantine/form';
import {
    TextInput,
    PasswordInput,
    Button,
    Group,
    Box,
    Select,
    Card,
    Image,
    Title,
    ButtonGroupSection,
    Flex,
    Text,
    ScrollArea,
} from '@mantine/core';
import { crearUsuario } from '../../../ApiFunctions/userServices';
import defaultUser from '../../../../objects/defaultUser';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import BackButton from '../../../components/BackButton';

const page = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const form = useForm({
        initialValues: {
            name: '',
            lastname: '',
            password: '',
            confirmPassword: '',
            user: '',
            email: '',
            address: '',
            ZIP: '',
            city: '',
            state: '',
            phone: '',
            type: '',
        },
        validate: {
            name: (value) => (value.trim().length > 0 ? null : 'Please enter your name'),
            user: (value) => (value.trim().length > 0 ? null : 'Please enter a username'),
            lastname: (value) => (value.trim().length > 0 ? null : 'Please enter your last name'),
            usuario: (value) => (value.trim().length >= 4 ? null : 'El usuario debe tener al menos 4 caracteres'),
            password: (value) => (value.length >= 6 ? null : 'Password must have at least 6 characters'),
            confirmPassword: (value, values) =>
                value === values.password ? null : `Passwords doesn't mathch`,
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Enter a valid email'),
            adress: (value) => (value.trim().length > 0 ? null : 'Address is required'),
            // phone: (value) => (/^\(\d{3}\) \d{3}-\d{4}$|^\d{3}-\d{3}-\d{4}$/.test(value) ? null : 'Please type a valid US phone number.'),
            ZIP: (value) => (/^\d{5}$/.test(value) ? null : 'Type a valid 5 digits ZIP code'),
            city: (value) => (value.trim().length > 0 ? null : 'City is required'),
            state: (value) => (value ? null : 'Select a State'),
        },
    });



    const handleSubmit = async (values) => {
        setLoading(true);
        // Simulación de envío
        try {
            const client = await crearUsuario(form.values);
            notifications.show({ title: "User successfully registered" })
            router.push('/login')
        }
        catch (error) {
            notifications.show({ title: 'User not registered, please check the form', message: error.message })
        }
        setLoading(false);

        // setTimeout(() => {
        //     setLoading(false);
        //     alert('¡Registro exitoso!');
        //     form.reset();
        // }, 2000);
    };

    return (
        <>
            <Box sx={{ maxWidth: 200 }} >
                <Card mx={200} mt={100} p={50} h="80vh">
                    <Flex justify="start" align="start">
                        <BackButton onClick={() => router.push('/superuser/usuarios')} />
                    </Flex>
                    <Title align="center">Registro de usuario</Title>
                    {form.values.type === '' ?
                        <>
                            <Flex direction="column" align="center" p="15vh">
                                <Title order={3} align="center" p="xl">Que tipo de usuario desea registrar?</Title>
                                <Flex direction="row" justify="center">
                                    <Button m="lg" onClick={() => form.setValues({ ...form.values, type: "administracion" })}>Administrador</Button>
                                    <Button m="lg" onClick={() => form.setValues({ ...form.values, type: "gerencia" })}>Gerencia</Button>
                                    <Button m="lg" onClick={() => form.setValues({ ...form.values, type: "almacen" })}>Almacen</Button>
                                    <Button m="lg" onClick={() => form.setValues({ ...form.values, type: "compras" })}>Compras</Button>
                                    <Button m="lg" onClick={() => form.setValues({ ...form.values, type: "ventas" })}>Ventas</Button>
                                    <Button m="lg" onClick={() => form.setValues({ ...form.values, type: "seguridad" })}>Seguridad</Button>
                                    <Button m="lg" onClick={() => form.setValues({ ...form.values, type: "calidad" })}>Calidad</Button>
                                    <Button m="lg" onClick={() => form.setValues({ ...form.values, type: "contabilidad" })}>Contabilidad</Button>
                                </Flex>
                            </Flex>
                        </> :
                        <ScrollArea>
                            <form onSubmit={form.onSubmit(handleSubmit)}>
                                <TextInput
                                    label="Nombre"
                                    placeholder="Nombre"
                                    required
                                    {...form.getInputProps('name')}
                                />

                                <TextInput
                                    label="Apellido"
                                    placeholder="Apellido"
                                    required
                                    {...form.getInputProps('lastname')}
                                />
                                <Select
                                    label="Departamento"
                                    placeholder="Selecciona un departamento"
                                    data={[
                                        { value: 'administracion', label: 'Administración' },
                                        { value: 'almacen', label: 'Almacén' },
                                        { value: 'ventas', label: 'Ventas' },
                                        { value: 'compras', label: 'Compras' },
                                        { value: 'contabilidad', label: 'Contabilidad' },
                                        { value: 'gerencia', label: 'Gerencia' },
                                        { value: 'seguridad', label: 'Seguridad' },
                                        { value: 'calidad', label: 'Calidad' },
                                    ]}
                                    searchable
                                    clearable
                                    {...form.getInputProps('user')}
                                />

                                <TextInput
                                    label="Email"
                                    placeholder="youremail@domain.com"
                                    required
                                    {...form.getInputProps('email')}
                                />
                                <PasswordInput
                                    label="Password"
                                    placeholder="Create a password"
                                    required
                                    {...form.getInputProps('password')}
                                />

                                <PasswordInput
                                    label="Confirm password"
                                    placeholder="Repeat your password"
                                    required
                                    {...form.getInputProps('confirmPassword')}
                                />
                                <TextInput
                                    label="Phone"
                                    placeholder="(XXX) XXX-XXXX"
                                    required
                                    {...form.getInputProps('phone')}
                                />

                                <Group position="right" mt="md">
                                    <Button type="submit" onClick={handleSubmit} loading={loading}>
                                        Register
                                    </Button>
                                    <Button type="submit" onClick={() => crearUsuario(defaultUser)} loading={loading}>
                                        Register default values
                                    </Button>
                                </Group>
                            </form>
                        </ScrollArea>
                    }
                </Card>
            </Box>

        </>
    );
}
export default page