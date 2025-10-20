'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Button, Group, Text, Paper, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export default function ListarSalidasPage() {
    const router = useRouter();
    const [salidas, setSalidas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/inventario/salidas').then(res => res.json()).then(data => {
            setSalidas(data);
            setLoading(false);
        });
    }, []);

    const rows = salidas.map((item) => (
        <Table.Tr key={item.id}>
            <Table.Td>{new Date(item.fecha).toLocaleString()}</Table.Td>
            <Table.Td>{item.consumible?.nombre}</Table.Td>
            <Table.Td>{item.activo?.codigoActivo}</Table.Td>
            <Table.Td fw={700}>- {parseFloat(item.cantidad).toFixed(2)} {item.consumible?.unidadMedida}</Table.Td>
            <Table.Td>{item.justificacion}</Table.Td>
        </Table.Tr>
    ));

    return (
        <Paper   shadow="md" p="xl" radius="md" mt={30}>
            <Group justify="space-between" mb="xl">
                <Title order={2}>Registro de Salidas</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => router.push('/superuser/inventario/salidas/nueva')}>
                    Nueva Salida
                </Button>
            </Group>
            <Table.ScrollContainer minWidth={800}>
                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Fecha</Table.Th>
                            <Table.Th>Consumible</Table.Th>
                            <Table.Th>Activo Asignado</Table.Th>
                            <Table.Th>Cantidad</Table.Th>
                            <Table.Th>Justificación</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={5}><Text ta="center">No hay salidas registradas.</Text></Table.Td></Table.Tr>}</Table.Tbody>
                </Table>
            </Table.ScrollContainer>
        </Paper>
    );
}