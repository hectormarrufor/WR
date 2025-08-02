// app/superuser/flota/grupos/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Title, Paper, LoadingOverlay, Alert, Group, Anchor, Text } from '@mantine/core';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GruposListPage() {
    const router = useRouter();
    const [grupos, setGrupos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchGrupos = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/gestionMantenimiento/grupos');
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'No se pudieron cargar los grupos');
                }
                setGrupos(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchGrupos();
    }, []);

    const eliminarGrupo = async (id) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este grupo?')) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/gestionMantenimiento/grupos/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'No se pudo eliminar el grupo');
            }
            setGrupos(grupos.filter(grupo => grupo.id !== id));
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    const rows = grupos.map((grupo) => (
        <Table.Tr key={grupo.id}>
            <Table.Td>{grupo.id}</Table.Td>
            <Table.Td>{grupo.nombre}</Table.Td>
            <Table.Td>{Object.keys(grupo.definicion).length}</Table.Td>
            <Table.Td>
                <Button 
                    leftSection={<IconPencil size={14} />} 
                    variant="outline"
                    onClick={() => router.push(`/superuser/flota/grupos/${grupo.id}/editar`)}
                >
                    Editar
                </Button>
                <Button 
                    leftSection={<IconTrash size={14} />} 
                    mx={10}
                    color='red'
                    variant="outline"
                    onClick={() => eliminarGrupo(grupo.id)}
                >
                    Eliminar
                </Button>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
            <Group justify="space-between" mb="xl">
                <Title order={2}>Grupos de Activos</Title>
                <Button
                    component={Link}
                    href="/superuser/flota/grupos/crear"
                    leftSection={<IconPlus size={14} />}
                >
                    Crear Nuevo Grupo
                </Button>
            </Group>
            
            <LoadingOverlay visible={loading} />
            
            {error && <Alert color="red" title="Error">{error}</Alert>}

            <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Nombre</Table.Th>
                        <Table.Th>Nº de Atributos Definidos</Table.Th>
                        <Table.Th>Acciones</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.length > 0 ? rows : (
                        <Table.Tr>
                            <Table.Td colSpan={4}>
                                <Text c="dimmed" align="center">No se encontraron grupos.</Text>
                            </Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
        </Paper>
    );
}