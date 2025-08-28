'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Button, Group, ActionIcon, Text, Modal, LoadingOverlay, Paper, Title } from '@mantine/core';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ListarActivosPage() {
    const router = useRouter();
    const [activos, setActivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpened, setModalOpened] = useState(false);
    const [activoToDelete, setActivoToDelete] = useState(null);

    const fetchActivos = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/gestionMantenimiento/activos');
            if (!response.ok) throw new Error('No se pudieron cargar los activos');
            const data = await response.json();
            setActivos(data);
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivos();
    }, []);

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
            fetchActivos(); // Recargar la lista
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setModalOpened(false);
            setActivoToDelete(null);
            setLoading(false);
        }
    };

    const rows = activos.map((activo) => (
        <Table.Tr key={activo.id} onClick={() => router.push(`/superuser/flota/activos/${activo.id}`)} style={{ cursor: 'pointer' }}>
            <Table.Td>{activo.codigoActivo}</Table.Td>
            <Table.Td>{activo.modelo?.nombre || 'N/A'}</Table.Td>
            <Table.Td>{activo.modelo?.categoria?.nombre || 'N/A'}</Table.Td>
            <Table.Td>
                <Text c={activo.estadoOperativo === 'Operativo' ? 'teal' : 'red'} fw={700}>
                    {activo.estadoOperativo}
                </Text>
            </Table.Td>
            <Table.Td>
                <Group gap="xs" onClick={(e) => e.stopPropagation()}>
                    <ActionIcon variant="subtle" color="blue" onClick={() => router.push(`/superuser/flota/activos/${activo.id}/editar`)}>
                        <IconPencil size={18} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => openDeleteModal(activo)}>
                        <IconTrash size={18} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Paper withBorder shadow="md" p="xl" radius="md" mt={30}>
            <LoadingOverlay visible={loading} />
            <Group justify="space-between" mb="xl">
                <Title order={2}>Gestión de Activos</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => router.push('/superuser/flota/activos/crear')}>
                    Crear Activo
                </Button>
            </Group>
            <Table.ScrollContainer minWidth={700}>
                <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Código del Activo</Table.Th>
                            <Table.Th>Modelo</Table.Th>
                            <Table.Th>Categoría</Table.Th>
                            <Table.Th>Estado Operativo</Table.Th>
                            <Table.Th>Acciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={5}><Text ta="center">No hay activos para mostrar.</Text></Table.Td></Table.Tr>}</Table.Tbody>
                </Table>
            </Table.ScrollContainer>

            <Modal opened={modalOpened} centered onClose={() => setModalOpened(false)} title="Confirmar Eliminación">
                <Text>¿Estás seguro de que deseas eliminar el activo <Text span fw={700}>{activoToDelete?.codigoActivo}</Text>? Esta acción no se puede deshacer.</Text>
                <Group justify="flex-end" mt="lg">
                    <Button variant="default" onClick={() => setModalOpened(false)}>Cancelar</Button>
                    <Button color="red" onClick={handleDelete}>Eliminar</Button>
                </Group>
            </Modal>
        </Paper>
    );
}