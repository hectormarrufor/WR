'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Button, Group, Text, Paper, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export default function ListarEntradasPage() {
    const router = useRouter();
    const [entradas, setEntradas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEntradas = async () => {
            setLoading(true);
            const response = await fetch('/api/inventario/entradas');
            const data = await response.json();
            setEntradas(data);
            setLoading(false);
        };
        fetchEntradas();
    }, []);

    const rows = entradas.map((item) => (
        <Table.Tr key={item.id}>
            <Table.Td>{new Date(item.fecha).toLocaleDateString()}</Table.Td>
            <Table.Td>{item.consumible?.nombre || 'N/A'}</Table.Td>
            <Table.Td fw={700}>+ {parseFloat(item.cantidad).toFixed(2)} {item.consumible?.unidadMedida}</Table.Td>
            <Table.Td>${parseFloat(item.costoUnitario).toFixed(2)}</Table.Td>
            <Table.Td>{item.proveedor || 'N/A'}</Table.Td>
        </Table.Tr>
    ));

    return (
        <Paper   shadow="md" p="xl" radius="md" mt={30}>
            <Group justify="space-between" mb="xl">
                <Title order={2}>Registro de Entradas</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => router.push('/superuser/inventario/entradas/nueva')}>
                    Nueva Entrada
                </Button>
            </Group>
            <Table.ScrollContainer minWidth={600}>
                <Table>
                    <Table.Thead>
                        <Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Consumible</Table.Th><Table.Th>Cantidad</Table.Th><Table.Th>Costo Unit.</Table.Th><Table.Th>Proveedor</Table.Th></Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={5}><Text ta="center">No hay entradas registradas.</Text></Table.Td></Table.Tr>}</Table.Tbody>
                </Table>
            </Table.ScrollContainer>
        </Paper>
    );
}