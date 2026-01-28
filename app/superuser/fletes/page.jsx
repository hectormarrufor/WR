'use client';

import { useState, useEffect } from 'react';
import { 
    Container, Title, Button, Group, Paper, Table, Badge, 
    Text, ActionIcon, Stack, Card, SimpleGrid, Tabs, rem 
} from '@mantine/core';
import { IconPlus, IconTruck, IconMapPin, IconEye, IconEdit, IconTrash } from '@tabler/icons-react';
import Link from 'next/link';
import { useMediaQuery } from '@mantine/hooks';

export default function FletesPage() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [fletes, setFletes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Simulación de carga de datos (Aquí harías tu fetch('/api/fletes'))
    useEffect(() => {
        // Mock data para visualizar
        setTimeout(() => {
            setFletes([
                { id: 1, codigo: 'FL-001', cliente: 'Polar C.A', destino: 'Caracas', fechaSalida: '2026-02-01', estado: 'programado', chofer: 'Juan Perez' },
                { id: 2, codigo: 'FL-002', cliente: 'PepsiCo', destino: 'Valencia', fechaSalida: '2026-01-28', estado: 'en_ruta', chofer: 'Carlos Diaz' },
                { id: 3, codigo: 'FL-003', cliente: 'Ferreteria EPA', destino: 'Maracaibo', fechaSalida: '2026-01-15', estado: 'completado', chofer: 'Luis Silva' },
            ]);
            setLoading(false);
        }, 1000);
    }, []);

    const getStatusBadge = (estado) => {
        switch (estado) {
            case 'programado': return <Badge color="blue">Por Ejecutar</Badge>;
            case 'en_ruta': return <Badge color="yellow" variant="filled">En Ejecución</Badge>;
            case 'completado': return <Badge color="green">Finalizado</Badge>;
            case 'cancelado': return <Badge color="red">Cancelado</Badge>;
            default: return <Badge color="gray">{estado}</Badge>;
        }
    };

    // --- VISTA DESKTOP (TABLA) ---
    const DesktopView = () => (
        <Paper withBorder p="md" radius="md" shadow="sm">
            <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Código</Table.Th>
                        <Table.Th>Cliente</Table.Th>
                        <Table.Th>Destino</Table.Th>
                        <Table.Th>Chofer</Table.Th>
                        <Table.Th>Fecha Salida</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {fletes.map((flete) => (
                        <Table.Tr key={flete.id}>
                            <Table.Td><Text fw={700}>{flete.codigo}</Text></Table.Td>
                            <Table.Td>{flete.cliente}</Table.Td>
                            <Table.Td>
                                <Group gap={5}>
                                    <IconMapPin size={14} color="gray" />
                                    {flete.destino}
                                </Group>
                            </Table.Td>
                            <Table.Td>{flete.chofer}</Table.Td>
                            <Table.Td>{flete.fechaSalida}</Table.Td>
                            <Table.Td>{getStatusBadge(flete.estado)}</Table.Td>
                            <Table.Td>
                                <Group justify="flex-end" gap="xs">
                                    <ActionIcon variant="subtle" color="blue"><IconEye size={18} /></ActionIcon>
                                    <ActionIcon variant="subtle" color="orange"><IconEdit size={18} /></ActionIcon>
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Paper>
    );

    // --- VISTA MÓVIL (CARDS) ---
    const MobileView = () => (
        <Stack>
            {fletes.map((flete) => (
                <Card key={flete.id} withBorder shadow="sm" radius="md">
                    <Group justify="space-between" mb="xs">
                        <Text fw={700} size="lg">{flete.codigo}</Text>
                        {getStatusBadge(flete.estado)}
                    </Group>
                    
                    <Text size="sm" c="dimmed" mb={4}>Cliente: <Text span fw={500} c="dark">{flete.cliente}</Text></Text>
                    <Text size="sm" c="dimmed" mb={4}>Chofer: <Text span fw={500} c="dark">{flete.chofer}</Text></Text>
                    
                    <Group gap={5} mb="md">
                        <IconMapPin size={16} color="blue" />
                        <Text size="sm" fw={500}>{flete.destino}</Text>
                    </Group>

                    <Group grow>
                        <Button variant="light" size="xs">Ver Detalles</Button>
                    </Group>
                </Card>
            ))}
        </Stack>
    );

    return (
        <Container fluid p="md">
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>Gestión de Fletes</Title>
                    <Text c="dimmed">Control de trabajos, rutas y costos</Text>
                </div>
                
                {/* BOTÓN CREAR */}
                <Button 
                    component={Link} 
                    href="/superuser/fletes/nuevo" 
                    leftSection={<IconPlus size={20} />}
                    size={isMobile ? 'sm' : 'md'}
                >
                    Nuevo Flete
                </Button>
            </Group>

            {/* PESTAÑAS DE FILTRO RÁPIDO */}
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
                    {/* RENDERIZADO CONDICIONAL SEGÚN PANTALLA */}
                    {isMobile ? <MobileView /> : <DesktopView />}
                </>
            )}
        </Container>
    );
}