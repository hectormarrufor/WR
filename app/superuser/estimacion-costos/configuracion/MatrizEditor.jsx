'use client';

import { useState, useEffect } from 'react';
import { 
    Paper, Table, NumberInput, TextInput, Button, Group, Text, Title, 
    ActionIcon, Stack, Divider, Card, Badge, LoadingOverlay 
} from '@mantine/core';
import { IconTrash, IconPlus, IconCalculator, IconDeviceFloppy } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function MatrizEditor({ matrizId }) {
    const [header, setHeader] = useState(null);
    const [filas, setFilas] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Cargar datos del Backend
    useEffect(() => {
        if (!matrizId) return;
        setLoading(true);
        fetch(`/api/configuracion/matriz/${matrizId}`)
            .then(r => r.json())
            .then(data => {
                setHeader(data.header);
                setFilas(data.detalles || []);
                setLoading(false);
            });
    }, [matrizId]);

    // Calcular el $/Km de una fila (Lógica del Excel)
    const calcularCostoFila = (f) => {
        if (!f.frecuenciaKm || f.frecuenciaKm === 0) return 0;
        return (f.cantidad * f.costoUnitario) / f.frecuenciaKm;
    };

    // Calcular Total General
    const totalKm = filas.reduce((sum, f) => sum + calcularCostoFila(f), 0);

    // Handlers
    const updateFila = (index, field, val) => {
        const nuevasFilas = [...filas];
        nuevasFilas[index][field] = val;
        setFilas(nuevasFilas);
    };

    const addFila = () => {
        setFilas([...filas, { descripcion: '', unidad: 'Unidad', cantidad: 1, frecuenciaKm: 10000, costoUnitario: 0 }]);
    };

    const removeFila = (index) => {
        setFilas(filas.filter((_, i) => i !== index));
    };

    const guardarCambios = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/configuracion/matriz/${matrizId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ detalles: filas, totalCalculado: totalKm })
            });
            if (res.ok) notifications.show({ title: 'Guardado', message: 'Estructura actualizada', color: 'green' });
        } catch (e) {
            notifications.show({ title: 'Error', message: 'No se pudo guardar', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    if (!header) return <Text>Seleccione un Perfil de Costos...</Text>;

    return (
        <Paper p="md" radius="md" withBorder>
            <LoadingOverlay visible={loading} />
            
            <Group justify="space-between" mb="md">
                <div>
                    <Title order={3}>{header.nombre}</Title>
                    <Text c="dimmed" size="sm">Estructura de Costos Operativos (Réplica Excel)</Text>
                </div>
                <Button 
                    leftSection={<IconDeviceFloppy size={18}/>} 
                    color="blue" 
                    onClick={guardarCambios}
                >
                    Guardar Cambios
                </Button>
            </Group>

            <Card withBorder radius="md" mb="lg" bg="gray.0">
                <Group justify="space-between">
                    <Group>
                        <IconCalculator size={32} color="gray" />
                        <div>
                            <Text fw={700} size="lg">Costo Variable Total</Text>
                            <Text size="xs" c="dimmed">Suma de todos los componentes</Text>
                        </div>
                    </Group>
                    <Badge size="xl" variant="filled" color="teal" style={{ fontSize: 18 }}>
                        ${totalKm.toFixed(4)} / Km
                    </Badge>
                </Group>
            </Card>

            <Table striped highlightOnHover withTableBorder>
                <Table.Thead bg="gray.1">
                    <Table.Tr>
                        <Table.Th>Descripción (Insumo)</Table.Th>
                        <Table.Th style={{ width: 100 }}>Unidad</Table.Th>
                        <Table.Th style={{ width: 100 }}>Cant.</Table.Th>
                        <Table.Th style={{ width: 140 }}>Frecuencia (Km)</Table.Th>
                        <Table.Th style={{ width: 140 }}>Costo Unit. ($)</Table.Th>
                        <Table.Th style={{ width: 140, textAlign: 'right' }}>Costo ($/Km)</Table.Th>
                        <Table.Th style={{ width: 50 }}></Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {filas.map((fila, i) => {
                        const costoKm = calcularCostoFila(fila);
                        return (
                            <Table.Tr key={i}>
                                <Table.Td>
                                    <TextInput 
                                        variant="unstyled" 
                                        value={fila.descripcion} 
                                        onChange={(e) => updateFila(i, 'descripcion', e.target.value)} 
                                        placeholder="Nombre del repuesto"
                                    />
                                </Table.Td>
                                <Table.Td>
                                    <TextInput 
                                        variant="unstyled" 
                                        value={fila.unidad} 
                                        onChange={(e) => updateFila(i, 'unidad', e.target.value)} 
                                    />
                                </Table.Td>
                                <Table.Td>
                                    <NumberInput 
                                        variant="unstyled" 
                                        value={fila.cantidad} 
                                        onChange={(val) => updateFila(i, 'cantidad', val)} 
                                        min={0}
                                        decimalScale={1}
                                    />
                                </Table.Td>
                                <Table.Td>
                                    <NumberInput 
                                        variant="unstyled" 
                                        value={fila.frecuenciaKm} 
                                        onChange={(val) => updateFila(i, 'frecuenciaKm', val)} 
                                        min={1}
                                        step={1000}
                                    />
                                </Table.Td>
                                <Table.Td>
                                    <NumberInput 
                                        variant="unstyled" 
                                        prefix="$"
                                        value={fila.costoUnitario} 
                                        onChange={(val) => updateFila(i, 'costoUnitario', val)} 
                                        min={0}
                                        decimalScale={2}
                                    />
                                </Table.Td>
                                <Table.Td style={{ textAlign: 'right', fontWeight: 700, color: '#228be6' }}>
                                    ${costoKm.toFixed(5)}
                                </Table.Td>
                                <Table.Td>
                                    <ActionIcon color="red" variant="subtle" onClick={() => removeFila(i)}>
                                        <IconTrash size={16}/>
                                    </ActionIcon>
                                </Table.Td>
                            </Table.Tr>
                        );
                    })}
                </Table.Tbody>
            </Table>
            
            <Button variant="subtle" leftSection={<IconPlus size={16}/>} mt="sm" onClick={addFila}>
                Agregar Insumo
            </Button>
        </Paper>
    );
}