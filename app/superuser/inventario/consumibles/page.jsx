'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Table,
    Button,
    Group,
    ActionIcon,
    Text,
    Modal,
    LoadingOverlay,
    Paper,
    Title,
    Badge,
    TextInput,
    Select,
    Pagination,
    Avatar,
    Stack,
    Center,
    Tooltip
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconChevronUp, IconChevronDown, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ListarConsumiblesPage() {
    const router = useRouter();

    // Estados de datos
    const [consumibles, setConsumibles] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    // Estados de filtros y paginación
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [tipoFilter, setTipoFilter] = useState('');
    const [sort, setSort] = useState({ field: 'createdAt', order: 'DESC' });

    const [debouncedSearch] = useDebouncedValue(search, 500);

    // Estado para modal de eliminación
    const [modalOpened, setModalOpened] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const fetchConsumibles = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pageSize.toString(),
                search: debouncedSearch || '',
                tipo: tipoFilter || '',
                sortBy: sort.field,
                sortOrder: sort.order
            });

            const response = await fetch(`/api/inventario/consumibles?${params.toString()}`);
            if (!response.ok) throw new Error('No se pudieron cargar los consumibles');

            const data = await response.json();

            // Ajuste para leer tu estructura JSON: { items: [], total: 1, ... }
            setConsumibles(data.items || []);
            setTotalPages(data.totalPages || 1);

        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
            setConsumibles([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsumibles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, debouncedSearch, tipoFilter, sort]);

    const handleSort = (field) => {
        setSort((prev) => ({
            field,
            order: prev.field === field && prev.order === 'ASC' ? 'DESC' : 'ASC'
        }));
    };

    const renderSortIcon = (field) => {
        if (sort.field !== field) return null;
        return sort.order === 'ASC' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />;
    };

    const openDeleteModal = (item) => {
        setItemToDelete(item);
        setModalOpened(true);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/inventario/consumibles/${itemToDelete.id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('No se pudo eliminar el consumible');

            notifications.show({ title: 'Éxito', message: 'Consumible eliminado correctamente.', color: 'green' });

            if (consumibles.length === 1 && page > 1) {
                setPage(page - 1);
            } else {
                fetchConsumibles();
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setModalOpened(false);
            setItemToDelete(null);
            setLoading(false);
        }
    };

    // --- FUNCIÓN HELPER: Extraer datos de los hijos (Filtro, Aceite, etc.) ---
    const extractDetalles = (item) => {
        // Inicializamos valores por defecto
        let codigo = 'N/A';
        let marca = 'Genérico';
        let imagen = null;
        let infoExtra = '';

        // Verificamos cuál hijo existe y extraemos la data
        if (item.Filtro) {
            codigo = item.Filtro.codigo;
            marca = item.Filtro.marca; // Ahora viene del hijo
            imagen = item.Filtro.imagen;
            infoExtra = item.Filtro.posicion;
        } else if (item.Aceite) {
            codigo = `${item.Aceite.viscosidad} ${item.Aceite.tipoBase || ''}`;
            marca = item.Aceite.marca || 'N/A'; // Ajustar si Aceite tiene marca
            infoExtra = item.Aceite.aplicacion;
        } else if (item.Baterium || item.Bateria) { // Sequelize a veces pluraliza a Bateria o Baterium
            const bat = item.Baterium || item.Bateria;
            codigo = bat.codigo; // El grupo
            marca = bat.marca;
            infoExtra = `${bat.amperaje} CCA`;
        } else if (item.Neumatico) {
            codigo = item.Neumatico.medida;
            marca = item.Neumatico.marca;
            infoExtra = item.Neumatico.modelo;
        } else if (item.Correa) {
            codigo = item.Correa.codigo;
            marca = item.Correa.marca;
        } else if (item.Sensor) {
            codigo = item.Sensor.codigo; // Asumiendo que sensor tiene código
            marca = item.Sensor.marca;
        }

        return { codigo, marca, imagen, infoExtra };
    };

    // --- RENDERIZADO DE FILAS ---
   // --- RENDERIZADO DE FILAS (MODIFICADO) ---
    const rows = consumibles.map((item) => {
        const detalles = extractDetalles(item);
        const imageUrl = detalles.imagen 
            ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${detalles.imagen}` 
            : null;

        return (
            <Table.Tr 
                key={item.id}
                // 1. Hacemos la fila clickeable
                style={{ cursor: 'pointer' }} 
                onClick={() => router.push(`/superuser/inventario/consumibles/${item.id}`)}
                // Opcional: efecto hover visual extra
                bg="var(--mantine-color-body)"
            >
                {/* COLUMNA: NOMBRE Y MARCA */}
                <Table.Td>
                    <Group gap="sm">
                        <Avatar 
                            src={imageUrl} 
                            alt={detalles.marca}
                            radius="md" 
                            size="md" 
                            color="blue"
                        >
                            {detalles.marca?.substring(0, 2).toUpperCase()}
                        </Avatar>
                        <Stack gap={0}>
                            <Text size="sm" fw={500} style={{ lineHeight: 1.2 }}>
                                {item.nombre}
                            </Text>
                            <Text size="xs" c="dimmed">
                                Marca: {detalles.marca}
                            </Text>
                        </Stack>
                    </Group>
                </Table.Td>

                {/* COLUMNA: CATEGORÍA */}
                <Table.Td>
                    <Badge color="gray" variant="light" tt="capitalize">
                        {item.categoria}
                    </Badge>
                </Table.Td>

                {/* COLUMNA: CÓDIGO / REFERENCIA */}
                <Table.Td>
                    <Group gap={4}>
                        <Text fw={600} size="sm">{detalles.codigo}</Text>
                        {detalles.infoExtra && (
                            <Tooltip label={detalles.infoExtra}>
                                <IconInfoCircle size={14} color="gray" style={{ cursor: 'help' }} />
                            </Tooltip>
                        )}
                    </Group>
                </Table.Td>

                {/* COLUMNA: STOCK */}
                <Table.Td>
                    <Text fw={700} size="sm">
                        {parseFloat(item.stockAlmacen).toFixed(2)} 
                        <Text span size="xs" c="dimmed" ml={4}>
                            {item.unidadMedida}
                        </Text>
                    </Text>
                    {parseFloat(item.stockAlmacen) <= parseFloat(item.stockMinimo) && (
                        <Badge color="red" size="xs" variant="dot">Bajo Stock</Badge>
                    )}
                </Table.Td>

                {/* COLUMNA: PRECIO PROMEDIO */}
                <Table.Td fw={500}>
                    ${parseFloat(item.precioPromedio).toFixed(2)}
                </Table.Td>

                {/* COLUMNA: ACCIONES */}
                <Table.Td>
                    <Group gap="xs">
                        <ActionIcon 
                            variant="subtle" 
                            color="blue" 
                            onClick={(e) => {
                                // 2. IMPORTANTE: Detenemos la propagación para que no abra el detalle
                                e.stopPropagation(); 
                                router.push(`/superuser/inventario/consumibles/${item.id}/editar`);
                            }}
                        >
                            <IconPencil size={18} />
                        </ActionIcon>
                        <ActionIcon 
                            variant="subtle" 
                            color="red" 
                            onClick={(e) => {
                                // 2. IMPORTANTE: Detenemos la propagación para que no abra el detalle
                                e.stopPropagation();
                                openDeleteModal(item);
                            }}
                        >
                            <IconTrash size={18} />
                        </ActionIcon>
                    </Group>
                </Table.Td>
            </Table.Tr>
        );
    });

    return (
        <Paper shadow="md" p="xl" radius="md" mt={30} pos="relative">
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />

            <Group justify="space-between" mb="lg">
                <Title order={2}>Gestión de Consumibles</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => router.push('/superuser/inventario/consumibles/nuevo')}>
                    Crear Consumible
                </Button>
            </Group>

            {/* BARRA DE FILTROS */}
            <Group mb="md" grow align="flex-end">
                <TextInput
                    label="Buscar"
                    placeholder="Nombre, Marca o Código..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.currentTarget.value);
                        setPage(1);
                    }}
                />
                <Select
                    label="Filtrar por Categoría"
                    placeholder="Todas"
                    data={[
                        { value: '', label: 'Todas' },
                        { value: 'filtro', label: 'Filtros' }, // Mapea a filtro% en backend
                        { value: 'aceite', label: 'Aceites' },
                        { value: 'bateria', label: 'Baterías' },
                        { value: 'neumatico', label: 'Neumáticos' },
                        { value: 'correa', label: 'Correas' },
                    ]}
                    value={tipoFilter}
                    onChange={(val) => {
                        setTipoFilter(val);
                        setPage(1);
                    }}
                    allowDeselect
                />
            </Group>

            {/* TABLA */}
            <Table.ScrollContainer minWidth={800}>
                <Table verticalSpacing="sm" highlightOnHover striped withTableBorder>
                    <Table.Thead bg="gray.1">
                        <Table.Tr>
                            <Table.Th style={{ cursor: 'pointer' }} onClick={() => handleSort('nombre')}>
                                <Group gap={4}>Descripción {renderSortIcon('nombre')}</Group>
                            </Table.Th>
                            <Table.Th>Categoría</Table.Th>
                            <Table.Th>Referencia / Código</Table.Th>
                            <Table.Th>Stock Actual</Table.Th>
                            <Table.Th>Precio Prom.</Table.Th>
                            <Table.Th>Acciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.length > 0 ? rows : (
                            <Table.Tr>
                                <Table.Td colSpan={6}>
                                    <Center p="xl">
                                        <Stack align="center">
                                            <IconSearch size={40} color="gray" />
                                            <Text c="dimmed">No se encontraron consumibles.</Text>
                                        </Stack>
                                    </Center>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
                <Group justify="center" mt="xl">
                    <Pagination
                        total={totalPages}
                        value={page}
                        onChange={setPage}
                        withEdges
                    />
                </Group>
            )}

            {/* MODAL ELIMINAR */}
            <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Confirmar Eliminación" centered>
                <Text>¿Estás seguro de que deseas eliminar: <Text span fw={700}>{itemToDelete?.nombre}</Text>?</Text>
                <Text size="xs" c="dimmed" mt="xs">Esta acción es irreversible.</Text>
                <Group justify="flex-end" mt="lg">
                    <Button variant="default" onClick={() => setModalOpened(false)}>Cancelar</Button>
                    <Button color="red" onClick={handleDelete}>Eliminar</Button>
                </Group>
            </Modal>
        </Paper>
    );
}