'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Table, Button, Group, ActionIcon, Text, Modal, LoadingOverlay, 
    Paper, Title, Loader, Avatar, TextInput, Select, Badge, Stack, Tooltip 
} from '@mantine/core';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconFilter } from '@tabler/icons-react';
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
            // Aseguramos que data.data es el array, según tu estructura JSON
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

    // Lógica de filtrado
    const filteredActivos = useMemo(() => {
        return activos.filter((activo) => {
            const details = getAssetDetails(activo);
            const query = search.toLowerCase();
            
            // Filtro de Texto (Busca en código, placa, marca, modelo)
            const matchesSearch = 
                activo.codigoInterno?.toLowerCase().includes(query) ||
                details.placa.toLowerCase().includes(query) ||
                details.marca.toLowerCase().includes(query) ||
                details.modelo.toLowerCase().includes(query) ||
                activo.ubicacionActual?.toLowerCase().includes(query);

            // Filtro de Tipo (Select)
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
            const response = await fetch(`/api/gestionMantenimiento/activos/${activoToDelete.id}`, {
                method: 'DELETE',
            });
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
        const imageUrl = activo.imagen 
            ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${activo.imagen}` 
            : null;

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
                            <Text fz="sm" fw={500}>{activo.codigoInterno}</Text>
                            <Text fz="xs" c="dimmed">{activo.tipoActivo}</Text>
                        </div>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Text fz="sm">{details.marca} {details.modelo}</Text>
                    {details.placa && <Badge variant="outline" size="xs" color="gray">{details.placa}</Badge>}
                </Table.Td>
                <Table.Td>
                    <Text fz="sm">{activo.ubicacionActual || 'No definida'}</Text>
                </Table.Td>
                <Table.Td>
                    <Badge 
                        color={activo.estado === 'Operativo' ? 'teal' : activo.estado === 'Mantenimiento' ? 'orange' : 'red'}
                        variant="light"
                    >
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
            
            {/* Header: Título + Buscadores + Botón Crear */}
            <Stack mb="xl">
                <Group justify="space-between" align="center">
                    <Title order={2}>Gestión de Activos</Title>
                    {isAdmin && (
                        <Button leftSection={<IconPlus size={16} />} onClick={() => router.push('/superuser/flota/activos/crear')}>
                            Crear Activo
                        </Button>
                    )}
                </Group>

                <Group grow>
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

            {/* Renderizado Condicional: Mobile vs Desktop */}
            {isMobile ? (
                <Stack>
                    {filteredActivos.length === 0 ? (
                        <Text ta="center" c="dimmed" py="xl">No se encontraron activos.</Text>
                    ) : (
                        filteredActivos.map((activo) => {
                            const details = getAssetDetails(activo);
                            const imageUrl = activo.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${activo.imagen}` : null;
                            
                            return (
                                <Paper 
                                    key={activo.id} 
                                    withBorder 
                                    p="md" 
                                    onClick={() => router.push(`/superuser/flota/activos/${activo.id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
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
                                        <div>
                                            <Text size="xs" c="dimmed">Ubicación</Text>
                                            <Text size="sm" fw={500}>{activo.ubicacionActual}</Text>
                                        </div>
                                        {details.placa && (
                                            <div>
                                                <Text size="xs" c="dimmed" ta="right">Placa</Text>
                                                <Text size="sm" fw={500}>{details.placa}</Text>
                                            </div>
                                        )}
                                    </Group>

                                    {isAdmin && (
                                        <Group mt="md" justify="flex-end" pt="sm" style={{ borderTop: '1px solid #eee' }}>
                                            <Button variant="light" size="xs" onClick={(e) => { e.stopPropagation(); router.push(`/superuser/flota/activos/${activo.id}/editar`); }}>
                                                Editar
                                            </Button>
                                            <Button variant="light" color="red" size="xs" onClick={(e) => { e.stopPropagation(); openDeleteModal(activo); }}>
                                                Eliminar
                                            </Button>
                                        </Group>
                                    )}
                                </Paper>
                            );
                        })
                    )}
                </Stack>
            ) : (
                <Table.ScrollContainer minWidth={800}>
                    <Table verticalSpacing="sm" highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Activo</Table.Th>
                                <Table.Th>Detalles</Table.Th>
                                <Table.Th>Ubicación</Table.Th>
                                <Table.Th>Estado</Table.Th>
                                <Table.Th>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredActivos.length > 0 ? rows : (
                                <Table.Tr>
                                    <Table.Td colSpan={5} py="xl">
                                        <Text ta="center" c="dimmed">No se encontraron activos que coincidan con la búsqueda.</Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            )}

            {/* Modal de Eliminación */}
            <Modal opened={modalOpened} centered onClose={() => setModalOpened(false)} title="Confirmar Eliminación">
                <Text>
                    ¿Estás seguro de que deseas eliminar el activo <Text span fw={700}>{activoToDelete?.codigoInterno}</Text>? 
                    Esta acción eliminará la trazabilidad asociada y no se puede deshacer.
                </Text>
                <Group justify="flex-end" mt="lg">
                    <Button variant="default" onClick={() => setModalOpened(false)}>Cancelar</Button>
                    <Button color="red" onClick={handleDelete} loading={loading}>Eliminar</Button>
                </Group>
            </Modal>
        </Paper>
    );
}