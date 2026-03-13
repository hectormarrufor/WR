'use client';
import { useState, useEffect } from 'react';
import { 
    Table, Badge, Button, Group, Text, Title, Paper, ActionIcon, 
    Modal, Stack, Divider, Box 
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconShoppingCart, IconEye, IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';

export default function PanelRequisiciones() {
    const [requisiciones, setRequisiciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReq, setSelectedReq] = useState(null);

    const fetchRequisiciones = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/compras/requisiciones');
            const result = await res.json();
            if (result.success) setRequisiciones(result.data);
        } catch (error) {
            notifications.show({ title: 'Error', message: 'No se pudieron cargar las requisiciones', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequisiciones();
    }, []);

    // Configuración visual de semáforos
    const getColorPrioridad = (prioridad) => {
        switch (prioridad) {
            case 'Critica': return 'red.8';
            case 'Alta': return 'orange.6';
            case 'Media': return 'blue.5';
            default: return 'gray.5';
        }
    };

    const getColorEstado = (estado) => {
        switch (estado) {
            case 'Pendiente': return 'orange.2'; // Texto naranja oscuro
            case 'En Cotizacion': return 'blue.2';
            case 'Aprobada': return 'teal.2';
            default: return 'gray.2';
        }
    };

    const handleProcesarCompra = () => {
        // Aquí conectaremos el paso de generar la Orden de Compra (PO)
        notifications.show({ 
            title: 'Módulo en Construcción', 
            message: 'Aquí se abrirá la selección de proveedor y precios para generar la Orden de Compra definitiva.', 
            color: 'blue' 
        });
    };

    return (
        <Box p="md">
            <Group justify="space-between" align="center" mb="xl">
                <Group>
                    <IconShoppingCart size={32} color="#fab005" />
                    <Title order={2} c="dark.8" tt="uppercase">Bandeja de Requisiciones</Title>
                </Group>
                <Button variant="outline" color="dark" onClick={fetchRequisiciones} loading={loading} radius="sm">
                    Actualizar
                </Button>
            </Group>

            <Paper withBorder shadow="sm" radius="md" p="0" style={{ overflow: 'hidden' }}>
                <Table striped highlightOnHover verticalSpacing="sm">
                    <Table.Thead bg="dark.9">
                        <Table.Tr>
                            <Table.Th c="white">Código REQ</Table.Th>
                            <Table.Th c="white">Fecha</Table.Th>
                            <Table.Th c="white">Origen (Taller)</Table.Th>
                            <Table.Th c="white">Prioridad</Table.Th>
                            <Table.Th c="white">Estado</Table.Th>
                            <Table.Th c="white" ta="center">Acción</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {requisiciones.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={6} ta="center" py="xl">
                                    <Text c="dimmed" fs="italic">No hay requisiciones pendientes en este momento.</Text>
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            requisiciones.map((req) => (
                                <Table.Tr key={req.id}>
                                    <Table.Td>
                                        <Text fw={800} size="sm">{req.codigo}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{new Date(req.fechaSolicitud).toLocaleDateString('es-VE')}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm" fw={600} c="blue.7">{req.ordenOrigen?.codigo || 'Stock General'}</Text>
                                        <Text size="xs" c="dimmed">Por: {req.solicitante?.nombre} {req.solicitante?.apellido}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge color={getColorPrioridad(req.prioridad)} variant="filled" radius="sm">
                                            {req.prioridad}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge color={getColorEstado(req.estado)} c="dark.9" variant="light" radius="sm">
                                            {req.estado}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td ta="center">
                                        <ActionIcon 
                                            variant="light" color="blue" size="lg" radius="sm"
                                            onClick={() => setSelectedReq(req)}
                                        >
                                            <IconEye size={20} />
                                        </ActionIcon>
                                    </Table.Td>
                                </Table.Tr>
                            ))
                        )}
                    </Table.Tbody>
                </Table>
            </Paper>

            {/* MODAL DE DETALLES DE LA REQUISICIÓN */}
            <Modal 
                opened={!!selectedReq} 
                onClose={() => setSelectedReq(null)} 
                title={<Text fw={900} size="lg" tt="uppercase">Detalle de Requisición</Text>} 
                size="lg" centered
            >
                {selectedReq && (
                    <Stack gap="md">
                        <Group justify="space-between" align="flex-start">
                            <Box>
                                <Text size="xl" fw={900} c="dark.8">{selectedReq.codigo}</Text>
                                <Text size="sm" c="dimmed">Generada el {new Date(selectedReq.fechaSolicitud).toLocaleString('es-VE')}</Text>
                            </Box>
                            <Badge size="lg" color={getColorPrioridad(selectedReq.prioridad)} radius="sm">{selectedReq.prioridad}</Badge>
                        </Group>

                        <Paper withBorder p="sm" bg="gray.0" radius="sm">
                            <Group gap="xs" mb="xs">
                                <IconAlertCircle size={18} color="#e03131" />
                                <Text size="sm" fw={800} tt="uppercase" c="dark.7">Justificación del Taller:</Text>
                            </Group>
                            <Text size="sm" fs="italic">"{selectedReq.justificacion}"</Text>
                        </Paper>

                        <Divider label="Lista de Compra Solicitada" labelPosition="center" />

                        <Table withTableBorder withColumnBorders variant="vertical">
                            <Table.Thead bg="gray.1">
                                <Table.Tr>
                                    <Table.Th>Ítem / Repuesto</Table.Th>
                                    <Table.Th ta="center">Cant. Solicitada</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {selectedReq.detalles?.map((det) => (
                                    <Table.Tr key={det.id}>
                                        <Table.Td>
                                            <Text size="sm" fw={600}>{det.consumible?.nombre}</Text>
                                        </Table.Td>
                                        <Table.Td ta="center">
                                            <Badge size="md" color="dark.8" radius="sm" variant="outline">
                                                {det.cantidadSolicitada} {det.consumible?.unidadMedida}
                                            </Badge>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" color="red.7" leftSection={<IconX size={16} />} radius="sm" onClick={() => setSelectedReq(null)}>
                                Rechazar
                            </Button>
                            <Button color="teal.7" leftSection={<IconCheck size={18} />} radius="sm" onClick={handleProcesarCompra}>
                                Cotizar / Generar O.C.
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Box>
    );
}