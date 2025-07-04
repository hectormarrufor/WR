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
    Grid,
    SimpleGrid,
    Stack,
    Paper,
    Container,
} from '@mantine/core';
import { crearUsuario } from '../../../ApiFunctions/userServices';
import defaultUser from '../../../../objects/defaultUser';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import BackButton from '../../../components/BackButton';
import { SectionBox } from '../../../components/SectionBox';
import { TipoVehiculoSelect } from './TipoVehiculoSelect';

const page = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const form = useForm({
        initialValues: {
            marca: '',
            modelo: '',
            placa: '',
            año: '',
            color: '',
            tipo: '',
            tipoPeso: '',
            transmision: '',
            ejes: '',
            combustible: '',
            serialCarroceria: '',
            serialMotor: '',
            neumatico: '',
            correa: '',
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
            neumatico: (value) => {
                const medida = normalizarMedida(value);
                const regex = /^\d{3}\/\d{2}R\d{2}$/;
                return regex.test(medida) ? null : 'Formato inválido. Usa 205/70R17';
            },

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
                <Card mx={30} mt={100} p={0} h="80vh" >
                    <Grid align="center">
                        {/* Columna izquierda: botón */}
                        <Grid.Col span={4}>
                            <Box style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <BackButton
                                    onClick={() =>
                                        form.values.tipoPeso !== ''
                                            ? form.setValues({ ...form.values, tipoPeso: '' })
                                            : router.push('/superuser/flota')
                                    }
                                />
                            </Box>
                        </Grid.Col>
                        <Grid.Col span={4}>
                            <Box style={{ textAlign: 'center' }}>
                                <Title order={2}>Registro de vehículo</Title>
                            </Box>
                        </Grid.Col>

                        {/* Columna derecha: vacío o futuro contenido */}
                        <Grid.Col span={4}>
                            <Box />
                        </Grid.Col>

                    </Grid>
                    {form.values.tipoPeso === '' ?
                        <>
                            <Flex direction="column" align="center" p="15vh">
                                <Title order={3} align="center" p="xl">Que tipo de flota desea registrar?</Title>
                                <Flex direction="row" justify="center">
                                    <Button m="lg" onClick={() => form.setValues({ ...form.values, tipoPeso: "liviana" })}>Liviana</Button>
                                    <Button m="lg" onClick={() => form.setValues({ ...form.values, tipoPeso: "pesada" })}>Pesada</Button>
                                </Flex>
                            </Flex>
                        </> :
                        <ScrollArea
                            styles={{
                                viewport: {
                                    backgroundColor: '#f1f3f5', // esto solo afecta el área donde se hace scroll
                                    margin: 0,
                                    padding: 20
                                }
                            }}
                        >

                            <form onSubmit={form.onSubmit(handleSubmit)}>
                                <SimpleGrid
                                    cols={2}
                                    spacing="xs"
                                    verticalSpacing="xs"
                                    breakpoints={[{ maxWidth: 'sm', cols: 1 }]}
                                >
                                    {/* Columna izquierda */}
                                    <Stack spacing="sm">
                                        <SectionBox section="datosGenerales" title="🔧 Datos Generales" cols={4}>
                                            <TextInput size='xs' label="Marca" required {...form.getInputProps('marca')} />
                                            <TextInput size='xs' label="Modelo" required {...form.getInputProps('modelo')} />
                                            <TextInput size='xs' label="Placa" required {...form.getInputProps('placa')} />
                                            <TextInput size='xs' label="Año" required {...form.getInputProps('ano')} />
                                            <TextInput size='xs' label="Color" required {...form.getInputProps('color')} />
                                            <TextInput size='xs' label="Serial de Carrocería" required {...form.getInputProps('serialCarroceria')} />
                                            <TipoVehiculoSelect form={form} peso="pesado"/>
                                            {/* <Select
                                                size='xs' label="Tipo de vehiculo pesado"
                                                placeholder="Selecciona el tipo"
                                                data={[
                                                    { value: 'chuto', label: 'Chuto' },
                                                    { value: 'otro', label: 'Otro' },
                                                ]}
                                                searchable
                                                clearable
                                                {...form.getInputProps('tipo')}
                                            /> */}
                                        </SectionBox>


                                        <SectionBox section="transmision" title="⚙️ Transmision">
                                            <TextInput size='xs' label="Tipo de Transmisión" required {...form.getInputProps('transmision')} />
                                        </SectionBox>

                                        <SectionBox section="neumaticos" title="🛞 Neumaticos">
                                            <TextInput size='xs' label="Número de ejes" required {...form.getInputProps('ejes')} />
                                        </SectionBox>


                                    </Stack>

                                    {/* Columna derecha */}
                                    <Stack spacing="sm">
                                        {/* Imagen */}
                                        <Box>
                                            <Image
                                                src="https://album.mediaset.es/eimg/2022/10/17/pago-vehiculos-pesados_9bc8.jpg?w=1024"
                                                radius="md"
                                                fit='contain'
                                                height={200}
                                                // withPlaceholder
                                                alt="Foto del vehículo"
                                            />
                                        </Box>

                                        <SectionBox section="motor" title="🔧 Motor" cols={2}>
                                            <TextInput size='xs' label="Serial de Motor" required {...form.getInputProps('serialMotor')} />
                                        </SectionBox>

                                        <SectionBox section="combustible" title="⛽ Combustible" cols={3}>
                                            <Select
                                                size='xs' label="Tipo de combustible"
                                                placeholder="Selecciona el tipo"
                                                data={[
                                                    { value: 'gasolina', label: 'Gasolina' },
                                                    { value: 'gasoil', label: 'Gasoil' },
                                                ]}
                                                searchable
                                                clearable
                                                {...form.getInputProps('combustible')}
                                            />
                                            <TextInput size='xs' label="Capacidad del tanque (L)" {...form.getInputProps('capacidadTanque')} />
                                        </SectionBox>


                                        <Group position="right" mt="md">
                                            <Button type="submit" onClick={handleSubmit} loading={loading}>
                                                Registrar
                                            </Button>
                                            <Button type="button" onClick={() => crearUsuario(defaultUser)} loading={loading}>
                                                Registrar con valores por defecto
                                            </Button>
                                        </Group>
                                    </Stack>
                                </SimpleGrid>
                            </form>


                        </ScrollArea>
                    }
                </Card>
            </Box>

        </>
    );
}
export default page