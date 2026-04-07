'use client';

import { useState, useEffect } from 'react';
import { 
    Container, Title, Button, Group, Paper, Table, Badge, 
    Text, ActionIcon, Stack, Card, Tabs 
} from '@mantine/core';
import { IconPlus, IconTruck, IconMapPin, IconEye, IconEdit, IconTrash } from '@tabler/icons-react';
import Link from 'next/link';
import { useMediaQuery } from '@mantine/hooks';
import dayjs from 'dayjs';

export default function FletesPage() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [fletes, setFletes] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFletes = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/fletes');
            if (!response.ok) throw new Error('Error al obtener fletes');
            const data = await response.json();
            console.log("Fletes obtenidos:", data); // Debug: Ver qué datos llegan
            setFletes(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFletes();
    }, []);

    const getStatusBadge = (estado) => {
        switch (estado) {
            case 'programado': return <Badge color="blue">Por Ejecutar</Badge>;
            case 'en_ruta': return <Badge color="yellow" variant="filled">En Ejecución</Badge>;
            case 'completado': return <Badge color="green">Finalizado</Badge>;
            case 'cancelado': return <Badge color="red">Cancelado</Badge>;
            default: return <Badge color="gray">{estado || 'Desconocido'}</Badge>;
        }
    };

    // --- VISTA DESKTOP (TABLA) ---
    const DesktopView = () => (
        <Paper withBorder p="md" radius="md" shadow="sm">
            <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Descripción / Nro</Table.Th>
                        <Table.Th>Cliente</Table.Th>
                        <Table.Th>Ruta</Table.Th>
                        <Table.Th>Chofer</Table.Th>
                        <Table.Th>Fecha Salida</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {fletes.length > 0 ? fletes.map((flete) => (
                        <Table.Tr key={flete.id}>
                            <Table.Td>
                                <Text fw={700}>{flete.descripcion || 'Sin descripción'}</Text>
                                <Text size="xs" c="dimmed">#{flete.nroFlete}</Text>
                            </Table.Td>
                            <Table.Td>{flete.Cliente?.nombre || flete.Cliente?.razonSocial || 'Desconocido'}</Table.Td>
                            <Table.Td>
                                <Stack gap={2}>
                                    <Group gap={5}>
                                        <IconMapPin size={14} color="gray" />
                                        <Text size="sm">{flete.origen}</Text>
                                    </Group>
                                    <Group gap={5}>
                                        <IconMapPin size={14} color="blue" />
                                        <Text size="sm">{flete.destino}</Text>
                                    </Group>
                                </Stack>
                            </Table.Td>
                            <Table.Td>{flete.chofer ? `${flete.chofer.nombre} ${flete.chofer.apellido}` : 'Sin asignar'}</Table.Td>
                            <Table.Td>{dayjs(flete.fechaSalida).format('DD/MM/YYYY HH:mm')}</Table.Td>
                            <Table.Td>{getStatusBadge(flete.estado)}</Table.Td>
                            <Table.Td>
                                <Group justify="flex-end" gap="xs">
                                    <ActionIcon 
                                        variant="subtle" 
                                        color="blue" 
                                        component={Link} 
                                        href={`/superuser/fletes/${flete.id}`}
                                    >
                                        <IconEye size={18} />
                                    </ActionIcon>
                                    <ActionIcon variant="subtle" color="orange">
                                        <IconEdit size={18} />
                                    </ActionIcon>
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    )) : (
                        <Table.Tr>
                            <Table.Td colSpan={7} ta="center" py="xl">
                                No hay fletes registrados este mes.
                            </Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
        </Paper>
    );

    // --- VISTA MÓVIL (CARDS) ---
    const MobileView = () => (
        <Stack>
            {fletes.length > 0 ? fletes.map((flete) => (
                <Card key={flete.id} withBorder shadow="sm" radius="md">
                    <Group justify="space-between" mb="xs">
                        <div>
                            <Text fw={700} size="lg">{flete.descripcion || 'Sin descripción'}</Text>
                            <Text size="xs" c="dimmed">#{flete.nroFlete}</Text>
                        </div>
                        {getStatusBadge(flete.estado)}
                    </Group>
                    
                    <Text size="sm" c="dimmed" mb={4}>
                        Cliente: <Text span fw={500} c="dark">{flete.Cliente?.nombre || flete.Cliente?.razonSocial || 'Desconocido'}</Text>
                    </Text>
                    <Text size="sm" c="dimmed" mb={4}>
                        Chofer: <Text span fw={500} c="dark">{flete.chofer ? `${flete.chofer.nombre} ${flete.chofer.apellido}` : 'Sin asignar'}</Text>
                    </Text>
                    <Text size="sm" c="dimmed" mb={8}>
                        Salida: <Text span fw={500} c="dark">{dayjs(flete.fechaSalida).format('DD/MM/YYYY HH:mm')}</Text>
                    </Text>
                    
                    <Group gap={5} mb={4}>
                        <IconMapPin size={16} color="gray" />
                        <Text size="sm" fw={400}>{flete.origen}</Text>
                    </Group>
                    <Group gap={5} mb="md">
                        <IconMapPin size={16} color="blue" />
                        <Text size="sm" fw={500}>{flete.destino}</Text>
                    </Group>

                    <Group grow>
                        <Button 
                            variant="light" 
                            size="xs" 
                            component={Link} 
                            href={`/superuser/fletes/${flete.id}`}
                        >
                            Ver Detalles
                        </Button>
                    </Group>
                </Card>
            )) : (
                <Text ta="center" py="xl" c="dimmed">No hay fletes registrados este mes.</Text>
            )}
        </Stack>
    );

    return (
        <Container fluid p="md">
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>Gestión de Fletes</Title>
                    <Text c="dimmed">Control de trabajos, rutas y costos</Text>
                </div>
                
                <Button 
                    component={Link} 
                    href="/superuser/fletes/nuevo" 
                    leftSection={<IconPlus size={20} />}
                    size={isMobile ? 'sm' : 'md'}
                >
                    Nuevo Flete
                </Button>
            </Group>

            <Tabs defaultValue="todos" mb="md">
                <Tabs.List>
                    <Tabs.Tab value="todos" leftSection={<IconTruck size={16}/>}>Todos</Tabs.Tab>
                    <Tabs.Tab value="ejecucion" color="yellow">En Ejecución</Tabs.Tab>
                    <Tabs.Tab value="finalizados" color="green">Finalizados</Tabs.Tab>
                </Tabs.List>
            </Tabs>

            {loading ? (
                <Text ta="center" py="xl">Cargando fletes...</Text>
            ) : (
                <>
                    {isMobile ? <MobileView /> : <DesktopView />}
                </>
            )}
        </Container>
    );
}