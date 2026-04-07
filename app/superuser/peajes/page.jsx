'use client';

import { useState, useEffect } from 'react';
import { 
    Paper, Title, Group, Button, Table, Badge, ActionIcon, 
    Modal, Stack, Text, LoadingOverlay, Box, Tooltip, Alert, Grid,
    Divider,
    Select,
    SimpleGrid
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconReceipt2, IconMapPin, IconUser, IconTrash, IconTruckReturn, IconMapRoute, IconCalculator, IconCurrencyDollar } from '@tabler/icons-react';
import dayjs from 'dayjs';

import RegistroPeajeForm from './components/RegistroPeajeForm';
import GoogleRouteMap from '../fletes/components/GoogleRouteMap';

export default function PeajesPage() {
    const [loading, setLoading] = useState(true);
    const [modalFormOpened, setModalFormOpened] = useState(false);
    
    // 🔥 ESTADOS PARA EL SIMULADOR DE MAPA 🔥
    const [modalMapaOpened, setModalMapaOpened] = useState(false);
    const [peajesSimulados, setPeajesSimulados] = useState([]);
    
    // Tarifas en Bolívares
    const [tarifasPeajeBs, setTarifasPeajeBs] = useState({
        '2': 0, '3': 0, '4': 0, '5': 160, '6': 0
    });
    
    // 🔥 Separamos Ida y Retorno 🔥
    const [ejesIda, setEjesIda] = useState('5'); 
    const [ejesRetorno, setEjesRetorno] = useState('5'); 
    
    const [tasaBcv, setTasaBcv] = useState(1);

    // Estados de datos
    const [tickets, setTickets] = useState([]);
    const [peajes, setPeajes] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [fletes, setFletes] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resTickets, resPeajes, resEmpleados, resFletes, resConfig, resBcv] = await Promise.all([
                fetch('/api/peajes/tickets'),
                fetch('/api/peajes'),
                fetch('/api/rrhh/empleados'), 
                fetch('/api/fletes'),
                fetch('/api/configuracion/general'),
                fetch('/api/bcv').catch(() => ({ json: () => ({}) })) 
            ]);

            const [dataTickets, dataPeajes, dataEmpleados, dataFletes, dataConfig, dataBcv] = await Promise.all([
                resTickets.json(),
                resPeajes.json(),
                resEmpleados.json(),
                resFletes.json(),
                resConfig.json(),
                resBcv.json()
            ]);

            console.log(dataFletes)

            if (dataTickets.success) setTickets(dataTickets.data || []);
            if (dataPeajes.success) setPeajes(dataPeajes.data || []);
            
            const listaEmpleados = dataEmpleados || dataEmpleados.items || [];
            setEmpleados(listaEmpleados.filter(e => e.puestos?.some(p => p.nombre.toLowerCase().includes('chofer')) || true));
            
            setFletes(dataFletes || []);

            if (dataConfig && typeof dataConfig === 'object') {
                setTarifasPeajeBs({
                    '2': parseFloat(dataConfig.tarifaPeaje2Ejes || 0),
                    '3': parseFloat(dataConfig.tarifaPeaje3Ejes || 0),
                    '4': parseFloat(dataConfig.tarifaPeaje4Ejes || 0),
                    '5': parseFloat(dataConfig.tarifaPeaje5Ejes || 0),
                    '6': parseFloat(dataConfig.tarifaPeaje6Ejes || 0),
                });
            }

            const tasaOficial = parseFloat(dataBcv.precio);
            setTasaBcv(tasaOficial > 0 ? tasaOficial : 1);

        } catch (error) {
            console.error("Error cargando datos:", error);
            notifications.show({ title: 'Error de conexión', message: 'No se pudieron cargar los registros.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este ticket? Esto revertirá el gasto en tesorería.")) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/peajes/tickets/${id}`, { method: 'DELETE' });
            const res = await response.json();
            
            if (res.success) {
                notifications.show({ title: 'Eliminado', message: 'Ticket y gasto anulados correctamente.', color: 'green' });
                fetchData();
            } else {
                throw new Error(res.error);
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
            setLoading(false);
        }
    };

    const handleRouteCalculated = (data) => {
        setPeajesSimulados(data.peajesEnRuta || []);
    };
    
    // 🔥 Cálculos Matemáticos con Ida y Retorno 🔥
    const tarifaIdaBs = tarifasPeajeBs[ejesIda] || 0;
    const tarifaRetornoBs = tarifasPeajeBs[ejesRetorno] || 0;
    
    const costoIdaBs = peajesSimulados.length * tarifaIdaBs;
    const costoRetornoBs = peajesSimulados.length * tarifaRetornoBs;
    
    const costoTotalSimuladoBs = costoIdaBs + costoRetornoBs;
    const costoTotalSimuladoUSD = costoTotalSimuladoBs / tasaBcv;

    return (
        <Stack gap="lg" pos="relative" p="md">
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            
            <Group justify="space-between" align="center">
                <Box>
                    <Title order={2} c="blue.9">Control de Peajes</Title>
                    <Text c="dimmed" size="sm">Registro operativo y enlace financiero de tickets en ruta.</Text>
                </Box>
                <Group>
                    <Button 
                        variant="light"
                        color="violet" 
                        leftSection={<IconMapRoute size={18} />} 
                        onClick={() => setModalMapaOpened(true)}
                    >
                        Simulador de Rutas
                    </Button>
                    <Button 
                        color="blue" 
                        leftSection={<IconPlus size={18} />} 
                        onClick={() => setModalFormOpened(true)}
                    >
                        Registrar Ticket
                    </Button>
                </Group>
            </Group>

            <Paper shadow="sm" radius="md" withBorder>
                <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                    <Table.Thead bg="gray.0">
                        <Table.Tr>
                            <Table.Th>Fecha</Table.Th>
                            <Table.Th>Peaje</Table.Th>
                            <Table.Th>Chofer</Table.Th>
                            <Table.Th>Referencia</Table.Th>
                            <Table.Th>Flete Asignado</Table.Th>
                            <Table.Th ta="right">Monto ($)</Table.Th>
                            <Table.Th w={80} ta="center">Acciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {tickets.length > 0 ? (
                            tickets.map((ticket) => (
                                <Table.Tr key={ticket.id}>
                                    <Table.Td fw={500}>{dayjs(ticket.fecha).format('DD/MM/YYYY')}</Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <IconMapPin size={16} color="var(--mantine-color-blue-6)" />
                                            <Text size="sm">{ticket.peaje?.nombre || 'Desconocido'}</Text>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <IconUser size={16} color="var(--mantine-color-gray-6)" />
                                            <Text size="sm">{ticket.chofer?.nombre} {ticket.chofer?.apellido}</Text>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        {ticket.referencia ? (
                                            <Badge variant="dot" color="gray">{ticket.referencia}</Badge>
                                        ) : (
                                            <Text size="xs" c="dimmed" fs="italic">S/N</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        {ticket.fleteId ? (
                                            // 🔥 AQUÍ AGREGAMOS EL TOOLTIP CON LA DESCRIPCIÓN Y EL NROFLETE 🔥
                                            <Tooltip label={ticket.flete?.descripcion || 'Sin descripción detallada'} withArrow position="top">
                                                <Badge color="violet" variant="light" leftSection={<IconTruckReturn size={10} />} style={{ cursor: 'help' }}>
                                                    Flete #{ticket.flete?.nroFlete || ticket.fleteId}
                                                </Badge>
                                            </Tooltip>
                                        ) : (
                                            <Badge color="yellow" variant="outline">Sin Enlazar</Badge>
                                        )}
                                    </Table.Td>
                                    <Table.Td ta="right">
                                        <Text fw={700} c="red.7">${parseFloat(ticket.monto).toFixed(2)}</Text>
                                    </Table.Td>
                                    <Table.Td ta="center">
                                        <Tooltip label="Eliminar Ticket y Gasto">
                                            <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(ticket.id)}>
                                                <IconTrash size={18} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </Table.Td>
                                </Table.Tr>
                            ))
                        ) : (
                            <Table.Tr>
                                <Table.Td colSpan={7}>
                                    <Box ta="center" py="xl">
                                        <IconReceipt2 size={40} color="var(--mantine-color-gray-4)" style={{ marginBottom: 10 }} />
                                        <Text c="dimmed">No hay tickets de peaje registrados.</Text>
                                    </Box>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Paper>

            <Modal 
                opened={modalFormOpened} 
                onClose={() => setModalFormOpened(false)} 
                size="xl" 
                padding={0}
                withCloseButton={false}
            >
                <RegistroPeajeForm 
                    empleados={empleados} 
                    peajesIniciales={peajes} 
                    fletesDisponibles={fletes} 
                    onSuccess={() => {
                        setModalFormOpened(false);
                        fetchData(); 
                    }}
                />
            </Modal>

            <Modal 
                opened={modalMapaOpened} 
                onClose={() => {
                    setModalMapaOpened(false);
                    setPeajesSimulados([]);
                }} 
                size="100%" 
                title={
                    <Group gap="sm">
                        <IconMapRoute color="var(--mantine-color-violet-6)" />
                        <Title order={3} c="violet.9">Simulador de Rutas y Peajes</Title>
                    </Group>
                }
            >
                <Grid gutter="md">
                    <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
                        <GoogleRouteMap 
                            onRouteCalculated={handleRouteCalculated}
                            peajes={peajes}
                            vehiculoAsignado={false} 
                        />
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
                        <Paper withBorder radius="md" p="md" bg="gray.0" h="100%">
                            <Stack>
                                <Title order={4} c="dark.4" display="flex" style={{ alignItems: 'center', gap: '8px' }}>
                                    <IconCalculator size={20} /> Proyección de Costos
                                </Title>
                                
                                <Divider />

                                <Group justify="space-between">
                                    <Text size="sm" fw={500} c="dimmed">Tasa BCV del Día:</Text>
                                    <Badge size="lg" color="green" variant="light" leftSection={<IconCurrencyDollar size={14}/>}>
                                        Bs. {tasaBcv.toFixed(2)}
                                    </Badge>
                                </Group>

                                <Group justify="space-between">
                                    <Text size="sm" fw={500} c="dimmed">Estaciones Detectadas:</Text>
                                    <Badge size="lg" color="blue" variant="light">{peajesSimulados.length}</Badge>
                                </Group>

                                <Divider label="Configuración de Ejes" labelPosition="center" />

                                <SimpleGrid cols={2} spacing="xs">
                                    <Select
                                        label="Ida"
                                        data={[
                                            { value: '2', label: '2 Ejes' },
                                            { value: '3', label: '3 Ejes' },
                                            { value: '4', label: '4 Ejes' },
                                            { value: '5', label: '5 Ejes' },
                                            { value: '6', label: '6 Ejes' },
                                        ]}
                                        value={ejesIda}
                                        onChange={setEjesIda}
                                        variant="filled"
                                        allowDeselect={false}
                                    />
                                    <Select
                                        label="Retorno"
                                        data={[
                                            { value: '2', label: '2 Ejes' },
                                            { value: '3', label: '3 Ejes' },
                                            { value: '4', label: '4 Ejes' },
                                            { value: '5', label: '5 Ejes' },
                                            { value: '6', label: '6 Ejes' },
                                        ]}
                                        value={ejesRetorno}
                                        onChange={setEjesRetorno}
                                        variant="filled"
                                        allowDeselect={false}
                                    />
                                </SimpleGrid>

                                <Group justify="space-between" align="flex-start" mt="xs">
                                    <Box>
                                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">Tarifa Ida</Text>
                                        <Text fw={700}>Bs. {tarifaIdaBs.toFixed(2)}</Text>
                                    </Box>
                                    <Box ta="right">
                                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">Tarifa Retorno</Text>
                                        <Text fw={700}>Bs. {tarifaRetornoBs.toFixed(2)}</Text>
                                    </Box>
                                </Group>

                                <Paper withBorder p="sm" bg="red.0" mt="md" style={{ borderColor: 'var(--mantine-color-red-3)' }}>
                                    <Text size="xs" tt="uppercase" fw={700} c="red.8" ta="center">Gasto Total Estimado</Text>
                                    <Text size="xl" fw={900} c="red.9" ta="center" mt={4}>
                                        ${costoTotalSimuladoUSD.toFixed(2)} USD
                                    </Text>
                                    <Text size="sm" fw={600} c="red.7" ta="center">
                                        (Bs. {costoTotalSimuladoBs.toFixed(2)})
                                    </Text>
                                </Paper>

                                {(tarifaIdaBs === 0 || tarifaRetornoBs === 0) && (
                                    <Alert variant="light" color="orange" title="Atención" mt="md">
                                        Una de las tarifas seleccionadas está en 0. Asegúrate de haberla configurado en el Módulo de Configuración.
                                    </Alert>
                                )}

                                {peajesSimulados.length > 0 && (
                                    <Stack gap="xs" mt="lg">
                                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">Peajes en la ruta trazada:</Text>
                                        {peajesSimulados.map((p, idx) => (
                                            <Paper key={idx} p="xs" withBorder shadow="xs">
                                                <Group gap="xs">
                                                    <IconReceipt2 size={16} color="var(--mantine-color-gray-6)" />
                                                    <Text size="sm" fw={600}>{p.nombre}</Text>
                                                </Group>
                                            </Paper>
                                        ))}
                                    </Stack>
                                )}
                            </Stack>
                        </Paper>
                    </Grid.Col>
                </Grid>
            </Modal>
        </Stack>
    );
}