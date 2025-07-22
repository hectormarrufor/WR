'use client'
import React, { useEffect, useState } from 'react';
import { useForm } from '@mantine/form';
import { useMediaQuery } from '@mantine/hooks';
import { useMantineTheme } from '@mantine/core'
import {
    TextInput,
    Button,
    Group,
    Box,
    Select,
    Card,
    Title,
    Flex,
    ScrollArea,
    Grid,
    SimpleGrid,
    Stack,
    Text, // Added Text for displaying status
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { TipoVehiculoSelect } from './TipoVehiculoSelect';
import { MedidaNeumaticoSelect } from './MedidaNeumaticoSelect';
import { AceiteCajaSelect } from './AceiteCajaSelect';
import { AceiteMotorSelect } from './AceiteMotorSelect';
import { TipoBombilloSelect } from './TipoBombilloSelect';
import { ImagenVehiculoUploader } from './ImageVehiculoUploader';
import BackButton from '../../../../components/BackButton';
import { SectionBox } from '../../../../components/SectionBox';
import { httpPost } from '../../../../ApiFunctions/httpServices';


const VehicleRegistrationPage = () => {
    const theme = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm({
        initialValues: {
            // Campos para el modelo Vehiculo
            marca: '',
            modelo: '',
            imagen: '', // URL de la imagen
            placa: '',
            vin: '', // ¡Nuevo campo VIN!
            ano: '',
            color: '',
            estadoOperativoGeneral: 'Desconocido', // Nuevo campo con valor por defecto
            
            // Campos para el modelo FichaTecnica, incluyendo los que irán en JSONB
            ejes: '', // Ahora en FichaTecnica
            tipo: '', // Ahora en FichaTecnica (tipo de vehículo: chuto, camion, etc.)
            tipoPeso: '', // Ahora en FichaTecnica (liviana/pesada)
            kilometraje: '',
            horometro: '',
            correas: { // Objeto para el JSONB 'correas'
                tipoCorreaMotor: '',
                ultimaRevisionKm: '',
                estado: 'ok',
            },
            neumaticos: { // Objeto para el JSONB 'neumaticos'
                medida: '',
                marca: '',
                vidaUtilKm: '',
                estado: 'ok',
            },
            combustible: { // Objeto para el JSONB 'combustible'
                tipoCombustible: '', // Renombrado de 'combustible.tipo'
                capacidadCombustible: '',
                inyectores: '',
                filtroCombustible: '',
            },
            transmision: { // Objeto para el JSONB 'transmision'
                tipo: '',
                nroVelocidades: '',
                tipoAceite: '',
                cantidad: '',
                intervaloCambioKm: '',
                ultimoCambioKm: '',
                status: 'ok',
            },
            motor: { // Objeto para el JSONB 'motor'
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
                    status: 'ok',
                }
            },
            carroceria: { // Objeto para el JSONB 'carroceria'
                serialCarroceria: '',
                tipoLuzDelanteraBaja: '',
                tipoLuzDelanteraAlta: '',
                tipoLuzIntermitenteDelantera: '',
                tipoLuzIntermitenteLateral: '',
                tipoLuzTrasera: '',
            }
        },
        validate: {
            // Validaciones para Vehiculo
            marca: (value) => (value ? null : 'La marca es requerida'),
            modelo: (value) => (value ? null : 'El modelo es requerido'),
            placa: (value) => (value ? null : 'La placa es requerida'),
            vin: (value) => (value ? null : 'El VIN es requerido'), // Validación para VIN
            ano: (value) => (value ? null : 'El año es requerido'),
            color: (value) => (value ? null : 'El color es requerido'),
            kilometraje: (value) => (value ? null : 'El kilometraje es requerido'),
            horometro: (value) => (value ? null : 'El horómetro es requerido'),

            // Validaciones para FichaTecnica (incluyendo los campos JSONB)
            ejes: (value) => (value ? null : 'El número de ejes es requerido'),
            tipo: (value) => (value ? null : 'El tipo de vehículo es requerido'),
            tipoPeso: (value) => (value ? null : 'El tipo de peso es requerido'),
            tipoCombustible: (value) => (value ? null : 'El tipo de combustible es requerido'),
            'correas.tipoCorreaMotor': (value) => (value ? null : 'El tipo de correa del motor es requerido'),
            'correas.ultimaRevisionKm': (value) => (value ? null : 'El último km de revisión de correas es requerido'),
            'neumaticos.medida': (value) => (value ? null : 'La medida del neumático es requerida'),
            'neumaticos.marca': (value) => (value ? null : 'La marca del neumático es requerida'),
            'neumaticos.vidaUtilKm': (value) => (value ? null : 'La vida útil de los neumáticos es requerida'),
            'combustible.capacidadCombustible': (value) => (value ? null : 'La capacidad de combustible es requerida'),
            'combustible.inyectores': (value) => (value ? null : 'El modelo de inyectores es requerido'),
            'combustible.filtroCombustible': (value) => (value ? null : 'El filtro de combustible es requerido'),
            'transmision.tipo': (value) => (value ? null : 'El tipo de transmisión es requerido'),
            'transmision.nroVelocidades': (value) => (value ? null : 'El número de velocidades es requerido'),
            'transmision.tipoAceite': (value) => (value ? null : 'El tipo de aceite de transmisión es requerido'),
            'transmision.cantidad': (value) => (value ? null : 'La cantidad de aceite de transmisión es requerida'),
            'transmision.intervaloCambioKm': (value) => (value ? null : 'El intervalo de cambio de aceite de transmisión es requerido'),
            'transmision.ultimoCambioKm': (value) => (value ? null : 'El último cambio de aceite de transmisión es requerido'),
            'motor.serialMotor': (value) => (value ? null : 'El serial del motor es requerido'),
            'motor.potencia': (value) => (value ? null : 'La potencia del motor es requerida'),
            'motor.nroCilindros': (value) => (value ? null : 'El número de cilindros es requerido'),
            'motor.filtroAceite': (value) => (value ? null : 'El filtro de aceite del motor es requerido'),
            'motor.filtroAire': (value) => (value ? null : 'El filtro de aire del motor es requerido'),
            'motor.aceite.viscosidad': (value) => (value ? null : 'La viscosidad del aceite del motor es requerida'),
            'motor.aceite.litros': (value) => (value ? null : 'La cantidad de litros de aceite del motor es requerida'),
            'motor.aceite.intervaloCambioKm': (value) => (value ? null : 'El intervalo de cambio de aceite del motor es requerido'),
            'motor.aceite.ultimoCambioKm': (value) => (value ? null : 'El último cambio de aceite del motor es requerido'),
            'carroceria.serialCarroceria': (value) => (value ? null : 'El serial de carrocería es requerido'),
            'carroceria.tipoLuzDelanteraBaja': (value) => (value ? null : 'El tipo de bombillo delantero bajo es requerido'),
            'carroceria.tipoLuzDelanteraAlta': (value) => (value ? null : 'El tipo de bombillo delantero alto es requerido'),
            'carroceria.tipoLuzIntermitenteDelantera': (value) => (value ? null : 'El tipo de bombillo intermitente delantero es requerido'),
            'carroceria.tipoLuzIntermitenteLateral': (value) => (value ? null : 'El tipo de bombillo intermitente lateral es requerido'),
            'carroceria.tipoLuzTrasera': (value) => (value ? null : 'El tipo de bombillo trasero es requerido'),
        },
    });

    useEffect(() => {
        console.log("Form values updated:", form.values);
        // Lógica para actualizar estadoOperativoGeneral basada en los sub-estados
        let generalStatus = 'Operativo'; // Asumimos operativo por defecto

        // Evaluar estado del motor
        if (form.values.motor.aceite.status === 'mantenimiento urgente') {
            generalStatus = 'No Operativo';
        } else if (form.values.motor.aceite.status === 'atencion' && generalStatus === 'Operativo') {
            generalStatus = 'Operativo con Advertencias';
        }

        // Evaluar estado de la transmisión
        if (form.values.transmision.status === 'mantenimiento urgente' && generalStatus !== 'No Operativo') {
            generalStatus = 'No Operativo';
        } else if (form.values.transmision.status === 'atencion' && generalStatus === 'Operativo') {
            generalStatus = 'Operativo con Advertencias';
        }

        // Puedes añadir más lógica para otros estados si los tuvieras (ej. neumáticos, correas)
        // Ejemplo simple para neumáticos (si tuvieran un status similar)
        // if (form.values.neumaticos.estado === 'critico' && generalStatus !== 'No Operativo') {
        //     generalStatus = 'No Operativo';
        // } else if (form.values.neumaticos.estado === 'atencion' && generalStatus === 'Operativo') {
        //     generalStatus = 'Operativo con Advertencias';
        // }


        if (form.values.estadoOperativoGeneral !== generalStatus) {
            form.setFieldValue('estadoOperativoGeneral', generalStatus);
        }

    }, [form.values.motor.aceite.status, form.values.transmision.status, form.values.estadoOperativoGeneral, form.values]);


    // Opcional: Rellenar con valores por defecto para pruebas
    useEffect(() => {
        form.setValues({
            "marca": "Kenworth",
            "modelo": "T800",
            "placa": "3HB43J",
            "vin": "1KPCT800L1234567", // Ejemplo de VIN
            "ano": "2020",
            "color": "blanco",
            "kilometraje": "500039",
            "horometro": "200",
            "imagen": "https://zfdhcaitqdnowkxr.public.blob.vercel-storage.com/T8003HB43J.jpg",
            "tipo": "Chuto",
            "ejes": "3",
            "correas": {
                "tipoCorreaMotor": "Correa V",
                "ultimaRevisionKm": "490000",
                "estado": "ok",
            },
            "neumaticos": {
                "medida": "205/70R17",
                "marca": "Michelin",
                "vidaUtilKm": "100000",
                "estado": "ok",
            },
            "combustible": {
                "tipoCombustible": "gasoil",
                "capacidadCombustible": "90",
                "inyectores": "No aplica",
                "filtroCombustible": "45ht"
            },
            "transmision": {
                "tipo": "manual",
                "nroVelocidades": "11",
                "tipoAceite": "DEXRON III",
                "cantidad": "40",
                "intervaloCambioKm": "50000", // Intervalo de 50.000 km
                "ultimoCambioKm": "500000", // Último cambio en 500.000 km
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
                    "intervaloCambioKm": "5000", // Intervalo de 5.000 km
                    "ultimoCambioKm": "500000", // Último cambio en 500.000 km
                    "status": "ok"
                }
            },
            "carroceria": {
                "serialCarroceria": "dsfgoh23523uhte",
                "tipoLuzDelanteraBaja": "H7",
                "tipoLuzDelanteraAlta": "H7",
                "tipoLuzIntermitenteDelantera": "H7",
                "tipoLuzIntermitenteLateral": "H7",
                "tipoLuzTrasera": "H7"
            },
        });
    }, []);

    useEffect(() => {
      console.log(form.values);
    }, [form])
    

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // 1. Preparar los datos para el modelo Vehiculo
            const vehiculoData = {
                marca: values.marca,
                modelo: values.modelo,
                placa: values.placa,
                vin: values.vin, // Incluir VIN
                ano: parseInt(values.ano),
                color: values.color,
                kilometraje: parseInt(values.kilometraje),
                horometro: parseInt(values.horometro),
                imagen: values.imagen,
                estadoOperativoGeneral: values.estadoOperativoGeneral, // Usar el estado calculado
                ejes: parseInt(values.ejes),
                tipo: values.tipo,
                tipoPeso: values.tipoPeso,
                correas: JSON.stringify(values.correas), // Convertir a string JSON
                neumaticos: JSON.stringify(values.neumaticos), // Convertir a string JSON
                combustible: JSON.stringify(values.combustible), // Convertir a string JSON
                transmision: JSON.stringify(values.transmision), // Convertir a string JSON
                motor: JSON.stringify(values.motor), // Convertir a string JSON
                carroceria: JSON.stringify(values.carroceria), // Convertir a string JSON
            };
            console.log(vehiculoData);
            

            // 2. Enviar los datos del vehículo
            const createdVehiculo = await httpPost('/api/vehiculos', values);
            notifications.show({ title: "Vehículo registrado exitosamente", message: `Placa: ${createdVehiculo.placa}`, color: 'green' });

            // 3. Preparar los datos para la Ficha Técnica, consolidando en JSONB
            // const fichaTecnicaData = {
            //     vehiculoId: createdVehiculo.id, // Sequelize usa 'id' por defecto
            //     ejes: parseInt(values.ejes),
            //     tipo: values.tipo,
            //     tipoPeso: values.tipoPeso,
            //     tipoCombustible: values.tipoCombustible,
            //     correas: JSON.stringify(values.correas), // Convertir a string JSON
            //     neumaticos: JSON.stringify(values.neumaticos), // Convertir a string JSON
            //     combustible: JSON.stringify(values.combustible), // Convertir a string JSON
            //     transmision: JSON.stringify(values.transmision), // Convertir a string JSON
            //     motor: JSON.stringify(values.motor), // Convertir a string JSON
            //     carroceria: JSON.stringify(values.carroceria), // Convertir a string JSON
            // };

            // // 4. Enviar los datos de la ficha técnica
            // await httpPost('/api/vehiculos/fichastecnicas', fichaTecnicaData);
            // notifications.show({ title: "Ficha Técnica registrada exitosamente", message: `Asociada al vehículo ${createdVehiculo.placa}`, color: 'green' });

            router.push('/superuser/flota/vehiculo');
        } catch (error) {
            console.error("Error al registrar vehículo o ficha técnica:", error);
            notifications.show({ title: 'Error en el registro', message: error.message || 'Ocurrió un error al registrar el vehículo o la ficha técnica.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Box sx={{ maxWidth: "100%", padding: "1rem" }}>
                <Card
                    mx="auto"
                    mt={100}
                    p="md"
                    radius="md"
                    shadow="sm"
                    style={{
                        width: "100%",
                        maxWidth: 1100,
                        height: "auto",
                        backgroundColor: "white",
                    }}
                >
                    <Grid align="center" gutter="md" breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
                        <Grid.Col span={4} xs={12} sm={4}>
                            <Box style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                                <BackButton
                                    onClick={() =>
                                        form.values.tipoPeso !== ''
                                            ? form.setValues({ ...form.values, tipoPeso: '' })
                                            : router.push('/superuser/flota/vehiculo')
                                    }
                                />
                            </Box>
                        </Grid.Col>

                        <Grid.Col span={4} xs={12} sm={4}>
                            <Box style={{ textAlign: 'center' }}>
                                <Title order={2} size={isMobile ? 'h4' : 'h2'}>
                                    Registro de Vehículo y Ficha Técnica
                                </Title>
                            </Box>
                        </Grid.Col>

                        <Grid.Col span={4} xs={12} sm={4}>
                            <Box />
                        </Grid.Col>
                    </Grid>

                    {form.values.tipoPeso === '' ? (
                        <Flex direction="column" align="center" p={isMobile ? "5vh" : "15vh"}>
                            <Title order={3} align="center" p="xl">
                                ¿Qué tipo de flota desea registrar?
                            </Title>
                            <Flex
                                direction={isMobile ? "column" : "row"}
                                gap="md"
                                justify="center"
                                wrap="wrap"
                            >
                                <Button m="sm" onClick={() => form.setValues({ ...form.values, tipoPeso: "liviana" })}>
                                    Liviana
                                </Button>
                                <Button m="sm" onClick={() => form.setValues({ ...form.values, tipoPeso: "pesada" })}>
                                    Pesada
                                </Button>
                            </Flex>
                        </Flex>
                    ) : (
                        <ScrollArea
                            type="always"
                            styles={{
                                viewport: {
                                    backgroundColor: '#f1f3f5',
                                    margin: 0,
                                    padding: 20,
                                },
                            }}
                        >
                            <form onSubmit={form.onSubmit(handleSubmit)}>
                                <SimpleGrid
                                    cols={isMobile ? 1 : 2}
                                    spacing="xs"
                                    verticalSpacing="xs"
                                    breakpoints={[{ maxWidth: 'sm', cols: 1 }]}
                                >

                                    {/* COLUMNA IZQUIERDA */}
                                    <Stack spacing="sm">
                                        {/* DATOS GENERALES DEL VEHÍCULO */}
                                        <SectionBox section="datosGeneralesVehiculo" title="🔧 Datos Generales del Vehículo" cols={3}>
                                            <TextInput size='xs' label="Marca" required {...form.getInputProps('marca')} />
                                            <TextInput size='xs' label="Modelo" required {...form.getInputProps('modelo')} />
                                            <TextInput size='xs' label="Placa" required {...form.getInputProps('placa')} />
                                            <TextInput size='xs' label="VIN" required {...form.getInputProps('vin')} /> {/* Campo VIN */}
                                            <TextInput size='xs' label="Año" required {...form.getInputProps('ano')} />
                                            <TextInput size='xs' label="Color" required {...form.getInputProps('color')} />
                                            <TextInput size='xs' label="Kilometraje" type="number" required {...form.getInputProps('kilometraje')} />
                                            <TextInput size='xs' label="Horómetro" type="number" required {...form.getInputProps('horometro')} />
                                            <Text size="xs" label="Estado Operativo General">
                                                <Text span fw={700}>Estado Operativo General:</Text> {form.values.estadoOperativoGeneral}
                                            </Text>
                                        </SectionBox>

                                        {/* DATOS DE FICHA TÉCNICA - NEUMÁTICOS, CORREAS Y COMBUSTIBLE */}
                                        <SectionBox section="fichaTecnicaBasica" title="📄 Ficha Técnica (Básicos)" cols={3}>
                                            <TipoVehiculoSelect form={form} /> {/* Ahora `tipo` está en FichaTecnica */}
                                            <TextInput size='xs' label="Número de Ejes" type="number" required {...form.getInputProps('ejes')} /> {/* Ahora `ejes` está en FichaTecnica */}

                                            {/* Sección de Neumáticos (JSONB) */}
                                            <Title order={5} mt="md">🛞 Neumáticos</Title>
                                            <MedidaNeumaticoSelect form={form} fieldName="neumaticos.medida" /> {/* Ajustado a subcampo */}
                                            <TextInput size='xs' label="Marca Neumático" required {...form.getInputProps('neumaticos.marca')} />
                                            <TextInput size='xs' label="Vida Útil Neumático (Km)" type="number" required {...form.getInputProps('neumaticos.vidaUtilKm')} />
                                            <TextInput size='xs' label="Estado Neumáticos" readOnly {...form.getInputProps('neumaticos.estado')} />

                                            {/* Sección de Correas (JSONB) */}
                                            <Title order={5} mt="md">⛓️ Correas</Title>
                                            <TextInput size='xs' label="Tipo de Correa de Motor" required {...form.getInputProps('correas.tipoCorreaMotor')} />
                                            <TextInput size='xs' label="Última Revisión Correas (Km)" type="number" required {...form.getInputProps('correas.ultimaRevisionKm')} />
                                            <TextInput size='xs' label="Estado Correas" readOnly {...form.getInputProps('correas.estado')} />

                                            {/* Sección de Combustible (JSONB) */}
                                            <Title order={5} mt="md">⛽ Combustible</Title>
                                            <Select
                                                size='xs' label="Tipo de combustible"
                                                placeholder="Selecciona el tipo"
                                                data={[
                                                    { value: 'gasolina', label: 'Gasolina' },
                                                    { value: 'gasoil', label: 'Gasoil' },
                                                    { value: 'gnv', label: 'GNV' },
                                                    { value: 'electrico', label: 'Eléctrico' },
                                                ]}
                                                searchable
                                                clearable
                                                {...form.getInputProps('tipoCombustible')} // Directamente en FichaTecnica
                                            />
                                            <TextInput size='xs' label="Capacidad Tanque (L)" type="number" {...form.getInputProps('combustible.capacidadCombustible')} />
                                            <TextInput size='xs' label="Filtro de Combustible" required {...form.getInputProps('combustible.filtroCombustible')} />
                                            <TextInput size='xs' label="Modelo de Inyectores" required {...form.getInputProps('combustible.inyectores')} />
                                        </SectionBox>

                                        {/* CARROCERÍA (JSONB) */}
                                        <SectionBox section="carroceria" title="💡 Carrocería (Ficha Técnica)" cols={3}>
                                            <TextInput size='xs' label="Serial de Carrocería" required {...form.getInputProps('carroceria.serialCarroceria')} />
                                            <TipoBombilloSelect form={form} fieldName="carroceria.tipoLuzDelanteraBaja"  posicion="carroceria.tipoLuzDelanteraBaja" label="Bombillo delantero baja" />
                                            <TipoBombilloSelect form={form} fieldName="carroceria.tipoLuzDelanteraAlta"  posicion="carroceria.tipoLuzDelanteraAlta" label="Bombillo delantero alta" />
                                            <TipoBombilloSelect form={form} fieldName="carroceria.tipoLuzIntermitenteDelantera"  posicion="carroceria.tipoLuzIntermitenteDelantera" label="Bombillo delantero intermitente" />
                                            <TipoBombilloSelect form={form} fieldName="carroceria.tipoLuzIntermitenteLateral"  posicion="carroceria.tipoLuzIntermitenteLateral" label="Bombillo lateral intermitente" />
                                            <TipoBombilloSelect form={form} fieldName="carroceria.tipoLuzTrasera"  posicion="carroceria.tipoLuzTrasera" label="Bombillo trasero" />
                                        </SectionBox>
                                    </Stack>

                                    {/* COLUMNA DERECHA */}
                                    <Stack spacing="sm">
                                        {/* IMAGEN DEL VEHÍCULO */}
                                        <SectionBox section="imagen" title="📸 Imagen del Vehículo">
                                            <ImagenVehiculoUploader form={form} />
                                        </SectionBox>

                                        {/* MOTOR (JSONB) */}
                                        <SectionBox section="motor" title="⚙️ Motor (Ficha Técnica)" cols={3}>
                                            <TextInput size='xs' label="Serial de Motor" required {...form.getInputProps('motor.serialMotor')} />
                                            <TextInput size='xs' label="Potencia" type="number" required {...form.getInputProps('motor.potencia')} />
                                            <TextInput size='xs' label="Número de Cilindros" type="number" required {...form.getInputProps('motor.nroCilindros')} />
                                            <TextInput size='xs' label="Filtro de Aceite" required {...form.getInputProps('motor.filtroAceite')} />
                                            <TextInput size='xs' label="Filtro de Aire" required {...form.getInputProps('motor.filtroAire')} />
                                            <AceiteMotorSelect form={form} fieldName="motor.aceite.viscosidad" /> {/* Ajustado a subcampo */}
                                            <TextInput size='xs' label="Cantidad litros de Aceite" type="number" required {...form.getInputProps('motor.aceite.litros')} />
                                            <TextInput size='xs' label="Intervalo Cambio Aceite (Km)" type="number" required {...form.getInputProps('motor.aceite.intervaloCambioKm')} />
                                            <TextInput size='xs' label="Último cambio Aceite (Km)" type="number" required {...form.getInputProps('motor.aceite.ultimoCambioKm')}
                                                disabled={!form.values.motor.aceite.intervaloCambioKm}
                                                onBlur={(e) => {
                                                    const kmActual = parseFloat(form.values.kilometraje);
                                                    const ultimoCambio = parseFloat(e.target.value);
                                                    const intervalo = parseFloat(form.values.motor.aceite.intervaloCambioKm);

                                                    if (!isNaN(kmActual) && !isNaN(ultimoCambio) && !isNaN(intervalo)) {
                                                        let status = "ok";
                                                        if (kmActual - ultimoCambio >= intervalo) {
                                                            status = "mantenimiento urgente";
                                                        } else if (kmActual - ultimoCambio >= (intervalo * 0.95)) { // Advertencia al 95% del intervalo
                                                            status = "atencion";
                                                        }
                                                        form.setFieldValue("motor.aceite.status", status);
                                                    }
                                                }}
                                            />
                                            <TextInput size='xs' label="Estado Aceite Motor" readOnly {...form.getInputProps('motor.aceite.status')} />
                                        </SectionBox>

                                        {/* TRANSMISIÓN (JSONB) */}
                                        <SectionBox section="transmision" title="⚙️ Transmisión (Ficha Técnica)" cols={3}>
                                            <Select
                                                size='xs' label="Tipo de cambios"
                                                placeholder="Selecciona el tipo"
                                                data={[
                                                    { value: 'manual', label: 'Manual / Sincrónico' },
                                                    { value: 'automatico', label: 'Automático' },
                                                ]}
                                                searchable
                                                clearable
                                                {...form.getInputProps('transmision.tipo')}
                                            />
                                            <TextInput size='xs' label="Número de velocidades" type="number" required {...form.getInputProps('transmision.nroVelocidades')} />
                                            <AceiteCajaSelect form={form} fieldName="transmision.tipoAceite" /> {/* Ajustado a subcampo */}
                                            <TextInput size='xs' label="Cantidad litros" type="number" required {...form.getInputProps('transmision.cantidad')} />
                                            <TextInput size='xs' label="Intervalo aceite (Km)" type="number" required {...form.getInputProps('transmision.intervaloCambioKm')} />
                                            <TextInput size='xs' label="Kilometraje de último cambio" type="number" required {...form.getInputProps('transmision.ultimoCambioKm')}
                                                disabled={!form.values.transmision.intervaloCambioKm}
                                                onBlur={(e) => {
                                                    const kmActual = parseFloat(form.values.kilometraje);
                                                    const ultimoCambio = parseFloat(e.target.value);
                                                    const intervalo = parseFloat(form.values.transmision.intervaloCambioKm);

                                                    if (!isNaN(kmActual) && !isNaN(ultimoCambio) && !isNaN(intervalo)) {
                                                        let status = "ok";
                                                        if (kmActual - ultimoCambio >= intervalo) {
                                                            status = "mantenimiento urgente";
                                                        } else if (kmActual - ultimoCambio >= (intervalo * 0.95)) { // Advertencia al 95% del intervalo
                                                            status = "atencion";
                                                        }
                                                        form.setFieldValue("transmision.status", status);
                                                    }
                                                }}
                                            />
                                            <TextInput size='xs' label="Estado Transmisión" readOnly {...form.getInputProps('transmision.status')} />
                                        </SectionBox>

                                        <Group position="right" mt="md">
                                            <Button type="submit" loading={loading}>
                                                Registrar Vehículo y Ficha Técnica
                                            </Button>
                                        </Group>
                                    </Stack>
                                </SimpleGrid>
                            </form>
                        </ScrollArea>
                    )}
                </Card>
            </Box>
        </>
    );
}

export default VehicleRegistrationPage;