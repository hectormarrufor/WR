'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Paper, Title, Group, Button, Table, Badge, ActionIcon,
    Modal, Stack, Text, LoadingOverlay, Box, Tooltip, Alert, Grid,
    Divider,
    Select,
    SimpleGrid,
    Avatar,
    ThemeIcon
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconPlus, IconReceipt2, IconMapPin, IconUser, IconTrash,
    IconTruckReturn, IconMapRoute, IconCalculator, IconCurrencyDollar,
    IconTrendingUp, IconInfoCircle, IconCalendar, IconTractor,
    IconClock, IconCar // <-- Añadido IconCar para los vehículos livianos
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';

// Activar plugin para el rango de fechas
dayjs.extend(minMax);

import RegistroPeajeForm from './components/RegistroPeajeForm';
import GoogleRouteMap from '../fletes/components/GoogleRouteMap';
import SimuladorRutaFleteModal from './components/SimuladorRutaFleteModal';

export default function PeajesPage() {

    const [loading, setLoading] = useState(true);
    const [modalFormOpened, setModalFormOpened] = useState(false);

    const [modalMapaOpened, setModalMapaOpened] = useState(false);
    const [peajesSimulados, setPeajesSimulados] = useState([]);

    const [tarifasPeajeBs, setTarifasPeajeBs] = useState({
        '2': 0, '3': 0, '4': 0, '5': 160, '6': 0
    });

    const [ejesIda, setEjesIda] = useState('5');
    const [ejesRetorno, setEjesRetorno] = useState('5');

    const [tasaBcv, setTasaBcv] = useState(1);

    const [tickets, setTickets] = useState([]);
    const [peajes, setPeajes] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [fletes, setFletes] = useState([]);
    const [simuladorFleteData, setSimuladorFleteData] = useState({ opened: false, tickets: [] });

    // Función para abrir el simulador
    const abrirSimuladorFlete = (ticketsGrupo) => {
        setSimuladorFleteData({ opened: true, tickets: ticketsGrupo });
    };

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

    // --- LÓGICA DE AGRUPACIÓN Y OVERVIEW ---
    const ticketsAgrupados = useMemo(() => {
        if (!tickets.length) return [];

        const grupos = {};

        tickets.forEach(ticket => {
            const fleteKey = ticket.fleteId || 'unassigned';
            if (!grupos[fleteKey]) {
                grupos[fleteKey] = {
                    fleteId: ticket.fleteId,
                    nroFlete: ticket.flete?.nroFlete || 'Sin Enlazar',
                    descripcion: ticket.flete?.descripcion || 'Tickets sin flete asignado',
                    items: [],
                    stats: {
                        totalBs: 0,
                        totalUsd: 0,
                        count: 0,
                        minDate: null,
                        maxDate: null,
                        frecuenciaMontos: {}
                    }
                };
            }

            const g = grupos[fleteKey];
            g.items.push(ticket);
            g.stats.count++;
            g.stats.totalBs += parseFloat(ticket.monto);
            g.stats.totalUsd += parseFloat(ticket.montoUsd);

            const fechaActual = dayjs(ticket.fecha);
            if (!g.stats.minDate || fechaActual.isBefore(g.stats.minDate)) g.stats.minDate = fechaActual;
            if (!g.stats.maxDate || fechaActual.isAfter(g.stats.maxDate)) g.stats.maxDate = fechaActual;

            const m = parseFloat(ticket.monto).toString();
            g.stats.frecuenciaMontos[m] = (g.stats.frecuenciaMontos[m] || 0) + 1;
        });

        return Object.values(grupos).map(grupo => {
            let costoPredominante = "Variable";
            const threshold = grupo.stats.count * 0.5;

            for (const [monto, cant] of Object.entries(grupo.stats.frecuenciaMontos)) {
                if (cant >= threshold) {
                    costoPredominante = `Bs. ${parseFloat(monto).toFixed(2)}`;
                    break;
                }
            }

            return { ...grupo, costoPredominante };
        }).sort((a, b) => (b.fleteId === null) - (a.fleteId === null));
    }, [tickets]);

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
                    <Text c="dimmed" size="sm">Historial operativo agrupado por flete activo.</Text>
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
                <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                    <Table.Thead bg="gray.0">
                        <Table.Tr>
                            <Table.Th>Fecha / Hora</Table.Th>
                            <Table.Th>Estación de Peaje</Table.Th>
                            <Table.Th>Chofer</Table.Th>
                            <Table.Th>Ref / Vehículo</Table.Th> {/* <-- Cambiado a Vehículo */}
                            <Table.Th ta="right">Monto (BS)</Table.Th>
                            <Table.Th ta="center">Tasa BCV</Table.Th>
                            <Table.Th ta="right">Monto ($)</Table.Th>
                            <Table.Th w={80} ta="center">Acciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {ticketsAgrupados.length > 0 ? (
                            ticketsAgrupados.map((grupo) => (
                                <React.Fragment key={grupo.fleteId || 'unassigned'}>
                                    {/* --- HEADER DEL GRUPO --- */}
                                    <Table.Tr bg="blue.0">
                                        <Table.Td colSpan={8} p={0}>
                                            <Paper p="sm" bg="blue.0" radius={0}>
                                                <Grid align="center">
                                                    <Grid.Col span={4}>
                                                        <Group gap="xs">
                                                            <ThemeIcon color="blue" variant="light" size="lg">
                                                                <IconTruckReturn size={20} />
                                                            </ThemeIcon>
                                                            <Box>
                                                                <Text fw={700} size="sm" c="blue.9">
                                                                    {grupo.nroFlete !== 'Sin Enlazar' ? `FLETE #${grupo.nroFlete}` : 'Tickets sin Flete'}
                                                                </Text>
                                                                <Text size="xs" c="dimmed" lineClamp={1}>{grupo.descripcion}</Text>
                                                            </Box>
                                                            {/* 🔥 NUEVO BOTÓN DE SIMULACIÓN 🔥 */}
                                                            {grupo.fleteId && (
                                                                <Tooltip label="Simular Trayecto Real">
                                                                    <ActionIcon
                                                                        variant="filled"
                                                                        color="blue"
                                                                        onClick={() => abrirSimuladorFlete(grupo.items)}
                                                                    >
                                                                        <IconMapRoute size={18} />
                                                                    </ActionIcon>
                                                                </Tooltip>
                                                            )}
                                                        </Group>
                                                    </Grid.Col>
                                                    <Grid.Col span={8}>
                                                        <Group justify="flex-end" gap="xl">
                                                            <Stack gap={0} align="center">
                                                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Tickets</Text>
                                                                <Badge variant="light" color="blue">{grupo.stats.count}</Badge>
                                                            </Stack>
                                                            <Stack gap={0} align="center">
                                                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Tarifa Base</Text>
                                                                <Text size="xs" fw={700}>{grupo.costoPredominante}</Text>
                                                            </Stack>
                                                            <Stack gap={0} align="center">
                                                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Rango</Text>
                                                                <Group gap={4}>
                                                                    <IconCalendar size={12} />
                                                                    <Text size="xs" fw={700}>{grupo.stats.minDate.format('DD/MM')} - {grupo.stats.maxDate.format('DD/MM/YY')}</Text>
                                                                </Group>
                                                            </Stack>
                                                            <Stack gap={0} align="flex-end">
                                                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Sub-Total</Text>
                                                                <Group gap="xs">
                                                                    <Text size="xs" fw={600} c="gray.6">Bs. {grupo.stats.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
                                                                    <Text size="sm" fw={800} c="blue.7">${grupo.stats.totalUsd.toFixed(2)}</Text>
                                                                </Group>
                                                            </Stack>
                                                        </Group>
                                                    </Grid.Col>
                                                </Grid>
                                            </Paper>
                                        </Table.Td>
                                    </Table.Tr>

                                    {/* --- FILAS DE TICKETS --- */}
                                    {grupo.items.map((ticket) => (
                                        <Table.Tr key={ticket.id}>
                                            <Table.Td>
                                                <Stack gap={0}>
                                                    <Text size="sm" fw={600}>{dayjs(ticket.fecha).format('DD/MM/YYYY')}</Text>
                                                    <Text size="xs" c="dimmed">{ticket.hora?.substring(0, 5) || '--:--'}</Text>
                                                </Stack>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <IconMapPin size={16} color="var(--mantine-color-blue-6)" />
                                                    <Text size="sm">{ticket.peaje?.nombre || 'Desconocido'}</Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <Avatar src={ticket.chofer?.imagen} size={26} radius="xl" />
                                                    <Text size="sm">{ticket.chofer?.nombre} {ticket.chofer?.apellido}</Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Stack gap={2}>
                                                    <Text size="xs" fw={700} c="dimmed">{ticket.referencia || 'S/N'}</Text>
                                                    
                                                    {/* --- LÓGICA DE VEHÍCULO PESADO/LIVIANO/OTRO --- */}
                                                    {ticket.tipoVehiculo === 'Liviano' ? (
                                                        <Group gap={4}>
                                                            <IconCar size={12} color="gray" />
                                                            <Text size="xs" fw={600}>Vehículo Liviano</Text>
                                                        </Group>
                                                    ) : ticket.tipoVehiculo === 'Otro' ? (
                                                        <Group gap={4}>
                                                            <IconInfoCircle size={12} color="gray" />
                                                            <Text size="xs" fw={600}>Otro</Text>
                                                        </Group>
                                                    ) : (
                                                        <Group gap={4}>
                                                            <IconTractor size={12} color="gray" />
                                                            <Text size="xs" fw={600}>{ticket.ejes || '?'} Ejes</Text>
                                                        </Group>
                                                    )}
                                                </Stack>
                                            </Table.Td>
                                            <Table.Td ta="right">
                                                <Text size="sm" fw={500}>Bs. {parseFloat(ticket.monto).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Group gap={4} justify="center">
                                                    <IconTrendingUp size={12} color="gray.5" />
                                                    <Text size="xs" c="dimmed" fw={600}>{parseFloat(ticket.tasaBcv || 1).toFixed(2)}</Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td ta="right">
                                                <Text fw={700} c="blue.7">${parseFloat(ticket.montoUsd || 0).toFixed(2)}</Text>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Tooltip label="Eliminar Ticket">
                                                    <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(ticket.id)}>
                                                        <IconTrash size={18} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                    {/* Separador visual entre bloques de fletes */}
                                    <Table.Tr>
                                        <Table.Td colSpan={8} p={4} bg="gray.1" style={{ border: 'none' }}></Table.Td>
                                    </Table.Tr>
                                </React.Fragment>
                            ))
                        ) : (
                            <Table.Tr>
                                <Table.Td colSpan={8}>
                                    <Box ta="center" py={50}>
                                        <IconReceipt2 size={48} color="var(--mantine-color-gray-4)" style={{ marginBottom: 12 }} />
                                        <Text c="dimmed" fw={500}>No se encontraron tickets de peaje.</Text>
                                    </Box>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Paper>

            {/* --- MODAL DEL SIMULADOR --- */}
            <SimuladorRutaFleteModal
                opened={simuladorFleteData.opened}
                onClose={() => setSimuladorFleteData({ opened: false, tickets: [] })}
                tickets={simuladorFleteData.tickets}
                peajesMaster={peajes} // Usamos el estado de peajes que ya carga la página
            />

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
                        <Title order={3} c="violet.9">Simulador de Rutas</Title>
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
                                    <IconCalculator size={20} /> Proyección
                                </Title>
                                <Divider />
                                <Group justify="space-between">
                                    <Text size="sm" fw={500} c="dimmed">Tasa BCV:</Text>
                                    <Badge size="lg" color="green" variant="light" leftSection={<IconCurrencyDollar size={14} />}>
                                        Bs. {tasaBcv.toFixed(2)}
                                    </Badge>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm" fw={500} c="dimmed">Estaciones:</Text>
                                    <Badge size="lg" color="blue" variant="light">{peajesSimulados.length}</Badge>
                                </Group>
                                <Divider label="Configuración" labelPosition="center" />
                                <SimpleGrid cols={2} spacing="xs">
                                    <Select
                                        label="Ida"
                                        data={['2', '3', '4', '5', '6'].map(v => ({ value: v, label: `${v} Ejes` }))}
                                        value={ejesIda}
                                        onChange={setEjesIda}
                                        variant="filled"
                                        allowDeselect={false}
                                    />
                                    <Select
                                        label="Retorno"
                                        data={['2', '3', '4', '5', '6'].map(v => ({ value: v, label: `${v} Ejes` }))}
                                        value={ejesRetorno}
                                        onChange={setEjesRetorno}
                                        variant="filled"
                                        allowDeselect={false}
                                    />
                                </SimpleGrid>
                                <Group justify="space-between" mt="xs">
                                    <Box>
                                        <Text size="xs" fw={700} c="dimmed">Ida</Text>
                                        <Text fw={700}>Bs. {tarifaIdaBs.toFixed(2)}</Text>
                                    </Box>
                                    <Box ta="right">
                                        <Text size="xs" fw={700} c="dimmed">Retorno</Text>
                                        <Text fw={700}>Bs. {tarifaRetornoBs.toFixed(2)}</Text>
                                    </Box>
                                </Group>
                                <Paper withBorder p="sm" bg="red.0" mt="md" style={{ borderColor: 'var(--mantine-color-red-3)' }}>
                                    <Text size="xs" tt="uppercase" fw={700} c="red.8" ta="center">Gasto Estimado</Text>
                                    <Text size="xl" fw={900} c="red.9" ta="center" mt={4}>
                                        ${costoTotalSimuladoUSD.toFixed(2)} USD
                                    </Text>
                                    <Text size="sm" fw={600} c="red.7" ta="center">
                                        (Bs. {costoTotalSimuladoBs.toFixed(2)})
                                    </Text>
                                </Paper>
                                {(tarifaIdaBs === 0 || tarifaRetornoBs === 0) && (
                                    <Alert variant="light" color="orange" icon={<IconInfoCircle size={16} />} title="Aviso" mt="md">
                                        Configura las tarifas en el módulo general.
                                    </Alert>
                                )}
                            </Stack>
                        </Paper>
                    </Grid.Col>
                </Grid>
            </Modal>
        </Stack>
    );
}