// app/superuser/fletes/[id]/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Container, Title, Grid, Card, Text, Badge, Group, Button, 
    Tabs, LoadingOverlay, Stack, Select, TextInput, NumberInput, Table, ActionIcon, Divider
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconMapPin, IconTruck, IconGasStation, IconReceipt2, IconBed, IconCash, IconDeviceFloppy } from '@tabler/icons-react';
import dayjs from 'dayjs';

export default function FleteDashboard() {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [flete, setFlete] = useState(null);

    const formViaticos = useForm({
        initialValues: {
            estado: '',
            observaciones: '',
            // Asumiendo que tienes estas columnas o las guardarás en un JSON de 'observaciones'
            ubicacionActual: '',
            gastoHotel: 0,
            gastoComida: 0
        }
    });

    const fetchFleteInfo = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/fletes/${id}`);
            const json = await res.json();
            if (json.success) {
                setFlete(json.data);
                formViaticos.setValues({
                    estado: json.data.estado,
                    observaciones: json.data.observaciones || '',
                    ubicacionActual: '', // Este es volátil, para actualizar
                    gastoHotel: 0, 
                    gastoComida: 0
                });
            } else {
                throw new Error(json.error);
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: 'No se pudo cargar el flete', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchFleteInfo();
    }, [id]);

    const handleActualizarOperativa = async (values) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/fletes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            const json = await res.json();
            if (json.success) {
                notifications.show({ title: 'Actualizado', message: 'Estado del viaje actualizado', color: 'green' });
                fetchFleteInfo();
            } else {
                throw new Error(json.error);
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    if (!flete) return <LoadingOverlay visible={loading} />;

    return (
        <Container fluid p="md" pos="relative">
            <LoadingOverlay visible={loading} />
            
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>Tablero Operativo: Flete {flete.nroFlete}</Title>
                    <Text c="dimmed">{flete.origen} → {flete.destino}</Text>
                </div>
                <Badge size="xl" color={flete.estado === 'en_ruta' ? 'yellow' : flete.estado === 'completado' ? 'green' : 'blue'}>
                    {flete.estado.toUpperCase()}
                </Badge>
            </Group>

            <Grid gutter="md">
                {/* PANEL LATERAL: INFORMACIÓN ESTÁTICA Y ACTUALIZACIÓN DIRECTA */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Card shadow="sm" p="lg" radius="md" withBorder>
                        <Title order={4} mb="md">Actualización en Ruta</Title>
                        <form onSubmit={formViaticos.onSubmit(handleActualizarOperativa)}>
                            <Stack gap="sm">
                                <Select
                                    label="Estado del Viaje"
                                    data={[
                                        { value: 'programado', label: 'Programado' },
                                        { value: 'en_ruta', label: 'En Ruta' },
                                        { value: 'completado', label: 'Completado' },
                                        { value: 'cancelado', label: 'Cancelado' }
                                    ]}
                                    {...formViaticos.getInputProps('estado')}
                                />
                                <TextInput
                                    label="Ubicación Actual"
                                    placeholder="Ej: Pernoctando en Carora"
                                    leftSection={<IconMapPin size={16} />}
                                    {...formViaticos.getInputProps('ubicacionActual')}
                                />
                                <Group grow>
                                    <NumberInput
                                        label="Gasto Hotel ($)"
                                        prefix="$"
                                        decimalScale={2}
                                        leftSection={<IconBed size={16} />}
                                        {...formViaticos.getInputProps('gastoHotel')}
                                    />
                                    <NumberInput
                                        label="Gasto Comida ($)"
                                        prefix="$"
                                        decimalScale={2}
                                        leftSection={<IconCash size={16} />}
                                        {...formViaticos.getInputProps('gastoComida')}
                                    />
                                </Group>
                                <TextInput
                                    label="Observaciones de Novedad"
                                    placeholder="Cualquier eventualidad..."
                                    {...formViaticos.getInputProps('observaciones')}
                                />
                                <Button type="submit" mt="md" color="blue" leftSection={<IconDeviceFloppy size={18} />}>
                                    Guardar Estatus
                                </Button>
                            </Stack>
                        </form>
                    </Card>
                </Grid.Col>

                {/* PANEL PRINCIPAL: GASTOS TERCERIZADOS (GASOIL Y PEAJES) */}
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Card shadow="sm" p="0" radius="md" withBorder>
                        <Tabs defaultValue="gasoil" p="sm">
                            <Tabs.List>
                                <Tabs.Tab value="gasoil" leftSection={<IconGasStation size={16} />}>Combustible</Tabs.Tab>
                                <Tabs.Tab value="peajes" leftSection={<IconReceipt2 size={16} />}>Peajes</Tabs.Tab>
                                <Tabs.Tab value="vehiculos" leftSection={<IconTruck size={16} />}>Recursos</Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="gasoil" pt="md">
                                <Group justify="space-between" px="md" mb="sm">
                                    <Title order={5}>Registro de Gasoil del Viaje</Title>
                                    <Button size="xs" variant="light" onClick={() => router.push(`/superuser/gasoil/nuevo?fleteId=${flete.id}`)}>
                                        Registrar Carga (Vara/Litros)
                                    </Button>
                                </Group>
                                <Divider />
                                <Table striped highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Fecha</Table.Th>
                                            <Table.Th>Vehículo</Table.Th>
                                            <Table.Th>Litros</Table.Th>
                                            <Table.Th>Vara (cm)</Table.Th>
                                            <Table.Th ta="right">Costo Total ($)</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {flete.cargasCombustible?.length > 0 ? (
                                            flete.cargasCombustible.map(carga => (
                                                <Table.Tr key={carga.id}>
                                                    <Table.Td>{dayjs(carga.fecha).format('DD/MM/YYYY')}</Table.Td>
                                                    <Table.Td>{carga.activo?.placa || 'N/A'}</Table.Td>
                                                    <Table.Td>{carga.litros} L</Table.Td>
                                                    <Table.Td>{carga.centimetrosVara || 'N/A'} cm</Table.Td>
                                                    <Table.Td ta="right">${carga.costoTotal || 0}</Table.Td>
                                                </Table.Tr>
                                            ))
                                        ) : (
                                            <Table.Tr><Table.Td colSpan={5} ta="center">Sin cargas de combustible registradas.</Table.Td></Table.Tr>
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Tabs.Panel>

                            <Tabs.Panel value="peajes" pt="md">
                                <Group justify="space-between" px="md" mb="sm">
                                    <Title order={5}>Peajes Cruzados</Title>
                                    <Button size="xs" variant="light" color="orange" onClick={() => router.push(`/superuser/peajes?fleteId=${flete.id}`)}>
                                        Registrar Ticket
                                    </Button>
                                </Group>
                                <Divider />
                                <Table striped highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Fecha</Table.Th>
                                            <Table.Th>Estación</Table.Th>
                                            <Table.Th>Ejes</Table.Th>
                                            <Table.Th ta="right">Monto ($)</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {flete.peajes?.length > 0 ? (
                                            flete.peajes.map(ticket => (
                                                <Table.Tr key={ticket.id}>
                                                    <Table.Td>{dayjs(ticket.fecha).format('DD/MM/YYYY')}</Table.Td>
                                                    <Table.Td>{ticket.peaje?.nombre}</Table.Td>
                                                    <Table.Td>{ticket.ejes}</Table.Td>
                                                    <Table.Td ta="right">${ticket.monto}</Table.Td>
                                                </Table.Tr>
                                            ))
                                        ) : (
                                            <Table.Tr><Table.Td colSpan={4} ta="center">Sin tickets de peaje registrados.</Table.Td></Table.Tr>
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Tabs.Panel>

                            <Tabs.Panel value="vehiculos" pt="md" px="md">
                                <Stack gap="sm">
                                    <Text fw={600}>Chuto Principal: <Text span fw={400}>{flete.vehiculo?.marca} {flete.vehiculo?.modelo} ({flete.vehiculo?.placa})</Text></Text>
                                    <Text fw={600}>Remolque: <Text span fw={400}>{flete.remolque ? `${flete.remolque.marca} (${flete.remolque.placa})` : 'Sin Remolque asignado'}</Text></Text>
                                    <Text fw={600}>Chofer: <Text span fw={400}>{flete.chofer?.nombre} {flete.chofer?.apellido}</Text></Text>
                                </Stack>
                            </Tabs.Panel>
                        </Tabs>
                    </Card>
                </Grid.Col>
            </Grid>
        </Container>
    );
}