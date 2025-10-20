'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Button, Group, ActionIcon, Text, Modal, LoadingOverlay, Paper, Title, Badge } from '@mantine/core';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ListarConsumiblesPage() {
    const router = useRouter();
    const [consumibles, setConsumibles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpened, setModalOpened] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const fetchConsumibles = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/inventario/consumibles');
            if (!response.ok) throw new Error('No se pudieron cargar los consumibles');
            const data = await response.json();
            setConsumibles(data);
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsumibles();
    }, []);

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
            fetchConsumibles();
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setModalOpened(false);
            setItemToDelete(null);
            setLoading(false);
        }
    };

    const rows = consumibles.map((item) => (
        <Table.Tr key={item.id}>
            <Table.Td>{item.nombre}</Table.Td>
            <Table.Td><Badge color="blue">{item.tipo}</Badge></Table.Td>
            <Table.Td>{item.sku || 'N/A'}</Table.Td>
            <Table.Td fw={700}>{parseFloat(item.stock).toFixed(2)} {item.unidadMedida}</Table.Td>
            <Table.Td fw={700}>{item.costoPromedio}</Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <ActionIcon variant="subtle" color="blue" onClick={() => router.push(`/superuser/inventario/consumibles/${item.id}/editar`)}>
                        <IconPencil size={18} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => openDeleteModal(item)}>
                        <IconTrash size={18} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Paper   shadow="md" p="xl" radius="md" mt={30}>
            <LoadingOverlay visible={loading} />
            <Group justify="space-between" mb="xl">
                <Title order={2}>Gestión de Consumibles</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => router.push('/superuser/inventario/consumibles/nuevo')}>
                    Crear Consumible
                </Button>
            </Group>
            <Table.ScrollContainer minWidth={600}>
                <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                        <Table.Tr><Table.Th>Nombre</Table.Th><Table.Th>Tipo</Table.Th><Table.Th>SKU</Table.Th><Table.Th>Stock Actual</Table.Th><Table.Th>Costo promedio ponderado</Table.Th><Table.Th>Acciones</Table.Th></Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={5}><Text ta="center">No hay consumibles definidos.</Text></Table.Td></Table.Tr>}</Table.Tbody>
                </Table>
            </Table.ScrollContainer>

            <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Confirmar Eliminación">
                <Text>¿Estás seguro de que deseas eliminar el consumible <Text span fw={700}>{itemToDelete?.nombre}</Text>?</Text>
                <Group justify="flex-end" mt="lg">
                    <Button variant="default" onClick={() => setModalOpened(false)}>Cancelar</Button>
                    <Button color="red" onClick={handleDelete}>Eliminar</Button>
                </Group>
            </Modal>
        </Paper>
    );
}