'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Table, Button, Group, ActionIcon, Text, Modal, LoadingOverlay, 
    Paper, Title, Avatar, TextInput, Select, Badge, Stack, Tooltip, SimpleGrid, ThemeIcon 
} from '@mantine/core';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconFilter, IconCash, IconClock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';
import { useMediaQuery } from '@mantine/hooks';

export default function ListarActivosPage() {
    const router = useRouter();
    const { isAdmin } = useAuth();
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Estados de datos
    const [activos, setActivos] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Estados de filtrado
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('Todos');

    // Estados de UI/Modales
    const [modalOpened, setModalOpened] = useState(false);
    const [activoToDelete, setActivoToDelete] = useState(null);

    const fetchActivos = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/gestionMantenimiento/activos');
            if (!response.ok) throw new Error('No se pudieron cargar los activos');
            const data = await response.json();
            setActivos(data.data || []);
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivos();
    }, []);

    // Helper para extraer datos planos del objeto anidado
    const getAssetDetails = (activo) => {
        let detalles = { marca: 'N/A', modelo: 'N/A', placa: '', color: '' };
        
        // Prioridad: Vehículo -> Remolque -> Máquina
        const instancia = activo.vehiculoInstancia || activo.remolqueInstancia || activo.maquinaInstancia;
        
        if (instancia) {
            detalles.placa = instancia.placa || '';
            detalles.color = instancia.color || '';
            if (instancia.plantilla) {
                detalles.marca = instancia.plantilla.marca;
                detalles.modelo = instancia.plantilla.modelo;
            }
        }
        return detalles;
    };

    // Helper para Extraer Pesos y Capacidades
    const getPesosYCapacidades = (activo) => {
        const instancia = activo.vehiculoInstancia || activo.remolqueInstancia || activo.maquinaInstancia || {};
        const plantilla = instancia.plantilla || {};

        const capacidad = activo.capacidadTonelajeMax 
            ? `${activo.capacidadTonelajeMax} T` 
            : (plantilla.capacidadCarga || plantilla.capacidadArrastre ? `${plantilla.capacidadCarga || plantilla.capacidadArrastre} T` : 'N/D');

        const tara = activo.tara 
            ? `${activo.tara} T` 
            : (plantilla.peso ? `${plantilla.peso} T` : 'N/D');

        return { capacidad, tara };
    };

    // ====================================================================
    // 🔥 CÁLCULO DE TOTALES GLOBALES DE LA FLOTA 🔥
    // ====================================================================
    const { totalValorFlota, totalHorasFlota } = useMemo(() => {
        return activos.reduce((acc, activo) => {
            acc.totalValorFlota += parseFloat(activo.valorReposicion) || 0;
            acc.totalHorasFlota += parseInt(activo.horasAnuales) || 0;
            return acc;
        }, { totalValorFlota: 0, totalHorasFlota: 0 });
    }, [activos]);


    // Lógica de filtrado
    const filteredActivos = useMemo(() => {
        return activos.filter((activo) => {
            const details = getAssetDetails(activo);
            const query = search.toLowerCase();
            
            const matchesSearch = 
                activo.codigoInterno?.toLowerCase().includes(query) ||
                details.placa.toLowerCase().includes(query) ||
                details.marca.toLowerCase().includes(query) ||
                details.modelo.toLowerCase().includes(query) ||
                activo.ubicacionActual?.toLowerCase().includes(query);

            const matchesType = typeFilter === 'Todos' || activo.tipoActivo === typeFilter;

            return matchesSearch && matchesType;
        });
    }, [activos, search, typeFilter]);

    const openDeleteModal = (activo) => {
        setActivoToDelete(activo);
        setModalOpened(true);
    };

    const handleDelete = async () => {
        if (!activoToDelete) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/gestionMantenimiento/activos/${activoToDelete.id}`, { method: 'DELETE' });
            if (response.status === 409) {
                const errorData = await response.json();
                throw new Error(errorData.message);
            }
            if (!response.ok) throw new Error('No se pudo eliminar el activo');

            notifications.show({ title: 'Éxito', message: 'Activo eliminado correctamente.', color: 'green' });
            fetchActivos(); 
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setModalOpened(false);
            setActivoToDelete(null);
            setLoading(false);
        }
    };

    // Generador de filas para tabla
    const rows = filteredActivos.map((activo) => {
        const details = getAssetDetails(activo);
        const { capacidad, tara } = getPesosYCapacidades(activo);
        
        const imageUrl = activo.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${activo.imagen}` : null;

        // Datos nuevos y financieros
        const anio = activo.anio || 'N/D';
        const horasAnuales = activo.horasAnuales ? `${activo.horasAnuales.toLocaleString()} hr` : 'N/D';
        const valor = activo.valorReposicion ? `$${activo.valorReposicion.toLocaleString()}` : 'N/D';
        const posesion = activo.costoPosesionHora ? `$${parseFloat(activo.costoPosesionHora).toFixed(2)}` : 'N/D';

        return (
            <Table.Tr 
                key={activo.id} 
                onClick={() => router.push(`/superuser/flota/activos/${activo.id}`)} 
                style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                className="hover:bg-gray-50"
            >
                <Table.Td>
                    <Group gap="sm">
                        <Avatar src={imageUrl} size={40} radius="xl" color="blue" alt={activo.codigoInterno}>
                            {activo.codigoInterno.substring(0, 2)}
                        </Avatar>
                        <div>
                            <Text fz="sm" fw={700}>{activo.codigoInterno}</Text>
                            <Text fz="xs" c="dimmed">{activo.tipoActivo}</Text>
                        </div>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Text fz="sm">{details.marca} {details.modelo}</Text>
                    {details.placa && <Badge variant="light" color="gray">{details.placa}</Badge>}
                </Table.Td>
                <Table.Td><Text fz="sm" fw={500}>{capacidad}</Text></Table.Td>
                <Table.Td><Text fz="sm" fw={500}>{tara}</Text></Table.Td>
                
                {/* --- NUEVAS COLUMNAS --- */}
                <Table.Td><Text fz="sm" fw={500} c="dimmed">{anio}</Text></Table.Td>
                <Table.Td><Text fz="sm" fw={700} c="indigo.7">{horasAnuales}</Text></Table.Td>

                <Table.Td><Text fz="sm" fw={600} c="dark.3">{valor}</Text></Table.Td>
                <Table.Td><Text fz="sm" fw={700} c="teal.7">{posesion}</Text></Table.Td>

                <Table.Td>
                    <Badge color={activo.estado === 'Operativo' ? 'teal' : activo.estado === 'Mantenimiento' ? 'orange' : 'red'} variant="light">
                        {activo.estado}
                    </Badge>
                </Table.Td>
                <Table.Td>
                    <Group gap="xs" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                            <>
                                <Tooltip label="Editar">
                                    <ActionIcon variant="subtle" color="blue" onClick={() => router.push(`/superuser/flota/activos/${activo.id}/editar`)}>
                                        <IconPencil size={18} />
                                    </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Eliminar">
                                    <ActionIcon variant="subtle" color="red" onClick={() => openDeleteModal(activo)}>
                                        <IconTrash size={18} />
                                    </ActionIcon>
                                </Tooltip>
                            </>
                        )}
                    </Group>
                </Table.Td>
            </Table.Tr>
        );
    });

    return (
        <Paper shadow="md" p="xl" radius="md" mt={30} pos="relative">
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            
            <Stack mb="xl">
                <Group justify="space-between" align="center">
                    <Title order={2}>Gestión de Activos</Title>
                    {isAdmin && (
                        <Button leftSection={<IconPlus size={16} />} onClick={() => router.push('/superuser/flota/activos/crear')}>
                            Crear Activo
                        </Button>
                    )}
                </Group>

                {/* 🔥 TARJETAS DE SUMATORIAS GLOBALES 🔥 */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="sm">
                    <Paper withBorder p="md" radius="md" bg="gray.0">
                        <Group>
                            <ThemeIcon size="xl" radius="md" color="blue" variant="light"><IconCash size={26} /></ThemeIcon>
                            <div>
                                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Valor Total de la Flota</Text>
                                <Text fw={900} size="xl" c="blue.9">${totalValorFlota.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                            </div>
                        </Group>
                    </Paper>
                    <Paper withBorder p="md" radius="md" bg="indigo.0">
                        <Group>
                            <ThemeIcon size="xl" radius="md" color="indigo" variant="light"><IconClock size={26} /></ThemeIcon>
                            <div>
                                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Horas Totales Estimadas (Anual)</Text>
                                <Text fw={900} size="xl" c="indigo.9">{totalHorasFlota.toLocaleString('en-US')} hrs</Text>
                            </div>
                        </Group>
                    </Paper>
                </SimpleGrid>

                <Group grow mt="sm">
                    <TextInput
                        placeholder="Buscar por código, placa, marca..."
                        leftSection={<IconSearch size={16} />}
                        value={search}
                        onChange={(event) => setSearch(event.currentTarget.value)}
                    />
                    <Select
                        placeholder="Filtrar por tipo"
                        leftSection={<IconFilter size={16} />}
                        data={['Todos', 'Vehiculo', 'Remolque', 'Maquina']}
                        value={typeFilter}
                        onChange={setTypeFilter}
                        allowDeselect={false}
                    />
                </Group>
            </Stack>

            {isMobile ? (
                <Stack>
                    {filteredActivos.length === 0 ? (
                        <Text ta="center" c="dimmed" py="xl">No se encontraron activos.</Text>
                    ) : (
                        filteredActivos.map((activo) => {
                            const details = getAssetDetails(activo);
                            const imageUrl = activo.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${activo.imagen}` : null;
                            const anio = activo.anio || 'N/D';
                            const horas = activo.horasAnuales ? `${activo.horasAnuales.toLocaleString()} hr` : 'N/D';
                            const valor = activo.valorReposicion ? `$${activo.valorReposicion.toLocaleString()}` : 'N/D';
                            const posesion = activo.costoPosesionHora ? `$${parseFloat(activo.costoPosesionHora).toFixed(2)}` : 'N/D';
                            
                            return (
                                <Paper key={activo.id} withBorder p="md" onClick={() => router.push(`/superuser/flota/activos/${activo.id}`)}>
                                    <Group justify="space-between" align="flex-start" mb="xs">
                                        <Group>
                                            <Avatar src={imageUrl} size="lg" radius="md" color="blue">
                                                {activo.codigoInterno.substring(0, 2)}
                                            </Avatar>
                                            <div>
                                                <Text fw={700}>{activo.codigoInterno}</Text>
                                                <Text size="xs" c="dimmed">{details.marca} {details.modelo}</Text>
                                            </div>
                                        </Group>
                                        <Badge color={activo.estado === 'Operativo' ? 'teal' : 'red'}>{activo.estado}</Badge>
                                    </Group>
                                    <Group justify="space-between" mt="md">
                                        <Stack gap={2}>
                                            <Text size="xs" c="dimmed">
                                                Año: <Text span fw={600} c="dark.3">{anio}</Text> | Uso: <Text span fw={700} c="indigo.7">{horas}</Text>
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Valor: <Text span fw={600} c="dark.3">{valor}</Text> | Posesión: <Text span fw={700} c="teal.7">{posesion}</Text>
                                            </Text>
                                        </Stack>
                                        {details.placa && (
                                            <div>
                                                <Text size="xs" c="dimmed" ta="right">Placa</Text>
                                                <Text size="sm" fw={500}>{details.placa}</Text>
                                            </div>
                                        )}
                                    </Group>
                                </Paper>
                            );
                        })
                    )}
                </Stack>
            ) : (
                <Table.ScrollContainer minWidth={1100}>
                    <Table verticalSpacing="sm" highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Activo</Table.Th>
                                <Table.Th>Detalles</Table.Th>
                                <Table.Th>Capacidad</Table.Th>
                                <Table.Th>Tara</Table.Th>
                                <Table.Th>Año</Table.Th>
                                <Table.Th>Horas/Año</Table.Th>
                                <Table.Th>Valor ($)</Table.Th>
                                <Table.Th>Posesión/Hr</Table.Th>
                                <Table.Th>Estado</Table.Th>
                                <Table.Th>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredActivos.length > 0 ? rows : (
                                <Table.Tr>
                                    <Table.Td colSpan={10} py="xl">
                                        <Text ta="center" c="dimmed">No se encontraron activos.</Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            )}

            <Modal opened={modalOpened} centered onClose={() => setModalOpened(false)} title="Confirmar Eliminación">
                <Text>
                    ¿Estás seguro de que deseas eliminar el activo <Text span fw={700}>{activoToDelete?.codigoInterno}</Text>?
                </Text>
                <Group justify="flex-end" mt="lg">
                    <Button variant="default" onClick={() => setModalOpened(false)}>Cancelar</Button>
                    <Button color="red" onClick={handleDelete} loading={loading}>Eliminar</Button>
                </Group>
            </Modal>
        </Paper>
    );
}