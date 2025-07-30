// app/superuser/flota/categorias/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Group, Title, Paper, LoadingOverlay, Text, ActionIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';
import Link from 'next/link';

export default function CategoriasListPage() {
    const router = useRouter();
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const handleDelete = async (id) => { 
        if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
            try {
                const response = await fetch(`/api/gestionMantenimiento/categorias/${id}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    throw new Error(`Error al eliminar la categoría: ${response.statusText}`);
                }
                notifications.show({
                    title: 'Éxito',
                    message: 'Categoría eliminada correctamente.',
                    color: 'green',
                });
                setCategorias(categorias.filter(cat => cat.id !== id));
            } catch (error) {
                notifications.show({
                    title: 'Error',
                    message: error.message,
                    color: 'red',
                });
            }
        }
    }

    useEffect(() => {
        async function fetchCategorias() {
            try {
                const response = await fetch('/api/gestionMantenimiento/categorias');
                if (!response.ok) {
                    throw new Error(`Error al cargar las categorías: ${response.statusText}`);
                }
                const data = await response.json();
                setCategorias(data);
            } catch (error) {
                notifications.show({
                    title: 'Error',
                    message: error.message,
                    color: 'red',
                });
            } finally {
                setLoading(false);
            }
        }
        fetchCategorias();
    }, []);

    const rows = categorias.map((cat) => (
        <Table.Tr key={cat.id}>
            <Table.Td>{cat.id}</Table.Td>
            <Table.Td>{cat.nombre}</Table.Td>
            <Table.Td>{cat.gruposBase.map(g => g.nombre).join(', ')}</Table.Td>
            <Table.Td>
                <Group>
                    <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => router.push(`/superuser/flota/categorias/${cat.id}/editar`)}
                    >
                        <IconPencil size={18} />
                    </ActionIcon>
                    {/* Aquí puedes añadir un modal de confirmación para borrar */}
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(cat.id)}>
                        <IconTrash size={18} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
            <Group justify="space-between" mb="xl">
                <Title order={2}>Categorías de Activos</Title>
                <Button
                    leftSection={<IconPlus size={14}/>}
                    component={Link}
                    href="/superuser/flota/categorias/crear"
                >
                    Crear Categoría
                </Button>
            </Group>

            {categorias.length > 0 ? (
                 <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>ID</Table.Th>
                            <Table.Th>Nombre</Table.Th>
                            <Table.Th>Grupos Base</Table.Th>
                            <Table.Th>Acciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows}</Table.Tbody>
                </Table>
            ) : (
                <Text>No hay categorías creadas todavía.</Text>
            )}
        </Paper>
    );
}