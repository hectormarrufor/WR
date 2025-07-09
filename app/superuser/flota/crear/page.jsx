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
import { MedidaNeumaticoSelect } from './MedidaNeumaticoSelect';
import { httpPost } from '../../../ApiFunctions/httpServices';
import { AceiteCajaSelect } from './AceiteCajaSelect';
import { AceiteMotorSelect } from './AceiteMotorSelect';
import { TipoBombilloSelect } from './TipoBombilloSelect';
import { ImagenVehiculoUploader } from './ImageVehiculoUploader';

const page = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const form = useForm({
        initialValues: {
            marca: '',
            modelo: '',
            placa: '',
            ano: '',
            color: '',
            tipo: '',
            tipoPeso: '',
            ejes: '',
            neumatico: '',
            kilometraje: '',
            horometro: '',
            filtroAire: '',
            correa: '',
            combustible: {
                tipo: '',
                capacidadCombustible: '',
                inyectores: '',
                filtroCombustible: '',
            },
            transmision: {
                nroVelocidades: '',
                tipoAceite: '',
                cantidad: '',
                intervaloCambioKm: '',
                ultimoCambioKm: '',
                status: '',
            },
            motor: {
                serialMotor: '',
                potencia: '',
                nroCilindros: '',
                filtroAceite: '',
                filtroAire: '',
                aceite: {
                    viscosidad: '',
                    litros: '',
                    intervaloCambioKm: '',
                    ultimoCambioKm: '',
                    status: '',
                }
            },
            carroceria: {
                serialCarroceria: '',
                tipoLuzDelanteraBaja: '',
                tipoLuzDelanteraAlta: '',
                tipoLuzIntermitenteDelantera: '',
                tipoLuzIntermitenteLateral: '',
                tipoLuzTrasera: '',
            }
        },
        validate: {

        },
    });

    // useEffect(() => {
    //     console.log(form.values);



    // }, [form])
    useEffect(() => {
        form.setValues(
            {
                "marca": "Kenworth",
                "modelo": "T800",
                "placa": "3HB43J",
                "ano": "2020",
                "color": "blanco",
                "tipo": "Chuto",
                "tipoPeso": "pesada",
                "ejes": "3",
                "neumatico": "205/70R17",
                "kilometraje": "500039",
                "horometro": "200",
                "filtroAire": "alguno",
                "correa": "alguna",
                "combustible": {
                    "tipo": "gasoil",
                    "capacidadCombustible": "90",
                    "inyectores": "no aplica",
                    "filtroCombustible": "45ht"
                },
                "transmision": {
                    "nroVelocidades": "11",
                    "tipoAceite": "DEXRON III",
                    "cantidad": "40",
                    "intervaloCambioKm": "5000",
                    "ultimoCambioKm": "500000",
                    "status": "ok"
                },
                "motor": {
                    "serialMotor": "4234t234thoisd8234h",
                    "potencia": "800",
                    "nroCilindros": "12",
                    "filtroAceite": "wix",
                    "filtroAire": "48",
                    "aceite": {
                        "viscosidad": "15W40",
                        "litros": "40",
                        "intervaloCambioKm": "5000",
                        "ultimoCambioKm": "500000",
                        "status": "ok"
                    }
                },
                "carroceria": {
                    "serialCarroceria": "dsfgoh23523uhte",
                    "tipoLuzDelanteraBaja": "h7",
                    "tipoLuzDelanteraAlta": "h7",
                    "tipoLuzIntermitenteDelantera": "h7",
                    "tipoLuzIntermitenteLateral": "h7",
                    "tipoLuzTrasera": "h7"
                },
                "imagen": "https://zfdhcaitqdnowkxr.public.blob.vercel-storage.com/T8003HB43J.jpg"
            }
        )

       
    }, [])


    const handleSubmit = async (values) => {
        setLoading(true);
        const {marca, modelo, placa, ano, imagen, color, tipo, tipoPeso, ejes, neumatico, kilometraje, horometro, correa, combustible, transmision, motor, carroceria} = form.values
        const vehiculoOrdenado = {
            marca,
            modelo,
            placa,
            ano,
            color,
            tipo,
            tipoPeso,
            ejes,
            neumatico,
            kilometraje,
            horometro,
            correa,
            combustible,
            transmision,
            motor,
            status: "ok",
            imagen,
            carroceria
        }
        // Simulación de envío
        try {
            const vehiculo = await httpPost('/api/vehiculos', vehiculoOrdenado);
            notifications.show({ title: "Vehiculo registrado exitosamente" })
            router.push('/superuser/flota')
        }
        catch (error) {
            notifications.show({ title: 'Vehiculo no registrado: ', message: error.message })
        }
        setLoading(false);
    };

    return (
        <>
            <Box sx={{ maxWidth: 200 }} >
                <Card mx={30} mt={100} p={0} h="80vh" >

                    {/* ENCABEZADO DE REGISTRO CON BOTON ATRAS */}
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
                        // MENU EN CASO DE QUE NO HAYA UN TIPO DE PESO SELECCIONADO
                        <>
                            <Flex direction="column" align="center" p="15vh">
                                <Title order={3} align="center" p="xl">Que tipo de flota desea registrar?</Title>
                                <Flex direction="row" justify="center">
                                    <Button m="lg" onClick={() => form.setValues({ ...form.values, tipoPeso: "liviana" })}>Liviana</Button>
                                    <Button m="lg" onClick={() => form.setValues({ ...form.values, tipoPeso: "pesada" })}>Pesada</Button>
                                </Flex>
                            </Flex>
                        </>

                        :

                        // MENU EN CASO DE QUE HAY UN TIPO DE PESO SELECCIONADO
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

                                    {/* COLUMNA IZQUIERDA */}

                                    <Stack spacing="sm">

                                        {/* DATOS GENERALES */}

                                        <SectionBox section="datosGenerales" title="🔧 Datos Generales" cols={3}>
                                            <TextInput size='xs' label="Marca" required {...form.getInputProps('marca')} />
                                            <TextInput size='xs' label="Modelo" required {...form.getInputProps('modelo')} />
                                            <TextInput size='xs' label="Placa" required {...form.getInputProps('placa')} />
                                            <TextInput size='xs' label="Año" required {...form.getInputProps('ano')} />
                                            <TextInput size='xs' label="Color" required {...form.getInputProps('color')} />
                                            <TextInput size='xs' label="kilometraje" required {...form.getInputProps('kilometraje')} />
                                            <TextInput size='xs' label="horometro" required {...form.getInputProps('horometro')} />
                                            <TipoVehiculoSelect form={form} />
                                            <TextInput size='xs' label="Número de ejes" required {...form.getInputProps('ejes')} />
                                        </SectionBox>

                                        {/* TRANSMISION */}

                                        <SectionBox section="transmision" title="⚙️ Transmision" cols={3}>
                                            <TextInput size='xs' label="Numero de velocidades" required {...form.getInputProps('transmision.nroVelocidades')} />
                                            <AceiteCajaSelect form={form} />
                                            <TextInput size='xs' label="Cantidad litros" required {...form.getInputProps('transmision.cantidad')} />
                                            <TextInput size='xs' label="Intervalo aceite" required {...form.getInputProps('transmision.intervaloCambioKm')} />
                                            <TextInput size='xs' label="kilometraje de ultimo cambio" required {...form.getInputProps('transmision.ultimoCambioKm')} />
                                        </SectionBox>

                                        {/* CARROCERIA */}

                                        <SectionBox section="transmision" title="⚙️ Carroceria" cols={3}>
                                            <TextInput size='xs' label="Serial de Carrocería" required {...form.getInputProps('carroceria.serialCarroceria')} />
                                            <TipoBombilloSelect form={form} posicion = "tipoLuzDelanteraBaja" label="Bombillo delantero baja" {...form.getInputProps('carroceria.tipoLuzDelanteraBaja')} />
                                            <TipoBombilloSelect form={form} posicion = "tipoLuzDelanteraAlta" label="Bombillo delantero alta" {...form.getInputProps('carroceria.tipoLuzDelanteraAlta')} />
                                            <TipoBombilloSelect form={form} posicion = "tipoLuzIntermitenteDelantera" label="Bombillo delantero intermitente" {...form.getInputProps('carroceria.tipoLuzIntermitenteDelantera')} />
                                            <TipoBombilloSelect form={form} posicion = "tipoLuzIntermitenteLateral" label="Bombillo lateral intermitente" {...form.getInputProps('carroceria.tipoLuzIntermitenteLateral')} />
                                            <TipoBombilloSelect form={form} posicion = "tipoLuzTrasera" label="Bombillo trasero" {...form.getInputProps('carroceria.tipoLuzTrasera')} />

                                        </SectionBox>




                                    </Stack>

                                    {/* COLUMNA DERECHA */}


                                    <Stack spacing="sm">

                                        {/* IMAGEN */}
                                        <SectionBox section="imagen" title="Imagen del vehiculo">
                                            <ImagenVehiculoUploader form={form} />
                                            {/* <Image
                                                src="https://album.mediaset.es/eimg/2022/10/17/pago-vehiculos-pesados_9bc8.jpg?w=1024"
                                                radius="md"
                                                fit='contain'
                                                height={200}
                                                // withPlaceholder
                                                alt="Foto del vehículo"
                                            /> */}
                                        </SectionBox>

                                        {/* MOTOR */}
                                        <SectionBox section="motor" title="🔧 Motor" cols={3}>
                                            <TextInput size='xs' label="Serial de Motor" required {...form.getInputProps('motor.serialMotor')} />
                                            <TextInput size='xs' label="Potencia" required {...form.getInputProps('motor.potencia')} />
                                            <TextInput size='xs' label="Numero de Cilindros" required {...form.getInputProps('motor.nroCilindros')} />
                                            <TextInput size='xs' label="Filtro de Aceite" required {...form.getInputProps('motor.filtroAceite')} />
                                            <TextInput size='xs' label="Filtro de Aire" required {...form.getInputProps('motor.filtroAire')} />
                                            <AceiteMotorSelect form={form} {...form.getInputProps('motor.aceite.viscosidad')} />
                                            <TextInput size='xs' label="Cantidad litros de Aceite" required {...form.getInputProps('motor.aceite.litros')} />
                                            <TextInput size='xs' label="Intervalo de Cambio de Aceite" required {...form.getInputProps('motor.aceite.intervaloCambioKm')} />
                                            <TextInput size='xs' label="Ultimo cambio de Aceite (en Km)" required {...form.getInputProps('motor.aceite.ultimoCambioKm')} />
                                        </SectionBox>


                                        <Flex gap="sm">
                                            {/* NEUMATICOS */}
                                            <SectionBox flex={10} section="neumaticos" title="🛞 Neumaticos">
                                                <MedidaNeumaticoSelect form={form} {...form.getInputProps('neumatico')} />
                                            </SectionBox>

                                            {/* COMBUSTIBLE */}
                                            <SectionBox flex={15} section="combustible" title="⛽ Combustible" cols={2}>
                                                <Select
                                                    size='xs' label="Tipo de combustible"
                                                    placeholder="Selecciona el tipo"
                                                    data={[
                                                        { value: 'gasolina', label: 'Gasolina' },
                                                        { value: 'gasoil', label: 'Gasoil' },
                                                    ]}
                                                    searchable
                                                    clearable
                                                    {...form.getInputProps('combustible.tipo')}
                                                />
                                                <TextInput size='xs' label="Capacidad del tanque (L)" {...form.getInputProps('combustible.capacidadCombustible')} />
                                                <TextInput size='xs' label="filtro de combustible" required {...form.getInputProps('combustible.filtroCombustible')} />
                                                <TextInput size='xs' label="modelo de inyectores" required {...form.getInputProps('combustible.inyectores')} />
                                            </SectionBox>
                                        </Flex>


                                        <Group position="right" mt="md">
                                            <Button type="submit" onClick={handleSubmit} loading={loading}>
                                                Registrar
                                            </Button>
                                            {/* <Button type="button" onClick={() => crearUsuario(defaultUser)} loading={loading}>
                                                Registrar con valores por defecto
                                            </Button> */}
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