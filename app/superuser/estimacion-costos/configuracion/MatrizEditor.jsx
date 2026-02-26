'use client';

import { useState, useEffect } from 'react';
import { 
    Paper, Table, NumberInput, TextInput, Button, Group, Text, Title, 
    ActionIcon, Stack, Card, Badge, LoadingOverlay, Select, ScrollArea
} from '@mantine/core';
import { IconTrash, IconPlus, IconCalculator, IconDeviceFloppy } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function MatrizEditor({ matrizId }) {
    const [header, setHeader] = useState(null);
    const [filas, setFilas] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Asumimos 2000 horas anuales / 12 meses para convertir los gastos mensuales a por Hora.
    const HORAS_POR_MES = 166.66; 

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

    // Función que devuelve cuánto aporta esta fila al $/Km y cuánto al $/Hr
    const calcularCostoFila = (f) => {
        if (!f.frecuencia || f.frecuencia === 0) return { km: 0, hora: 0 };
        
        const costoGasto = f.cantidad * f.costoUnitario;
        
        if (f.tipoDesgaste === 'km') {
            return { km: costoGasto / f.frecuencia, hora: 0 };
        } 
        else if (f.tipoDesgaste === 'horas') {
            return { km: 0, hora: costoGasto / f.frecuencia };
        } 
        else if (f.tipoDesgaste === 'meses') {
            return { km: 0, hora: costoGasto / (f.frecuencia * HORAS_POR_MES) };
        }
        
        return { km: 0, hora: 0 };
    };

    const totalKm = filas.reduce((sum, f) => sum + calcularCostoFila(f).km, 0);
    const totalHora = filas.reduce((sum, f) => sum + calcularCostoFila(f).hora, 0);

    const updateFila = (index, field, val) => {
        const nuevasFilas = [...filas];
        nuevasFilas[index][field] = val;
        
        // Auto-calcular promedio
        if (field === 'costoMinimo' || field === 'costoMaximo') {
            const min = field === 'costoMinimo' ? val : nuevasFilas[index].costoMinimo;
            const max = field === 'costoMaximo' ? val : nuevasFilas[index].costoMaximo;
            nuevasFilas[index].costoUnitario = (min + max) / 2;
        }
        setFilas(nuevasFilas);
    };

    const addFila = () => {
        setFilas([...filas, { 
            descripcion: '', unidad: 'Unidad', cantidad: 1, 
            tipoDesgaste: 'km', frecuencia: 10000, 
            costoMinimo: 0, costoUnitario: 0, costoMaximo: 0 
        }]);
    };

    const removeFila = (index) => setFilas(filas.filter((_, i) => i !== index));

    const guardarCambios = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/configuracion/matriz/${matrizId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    detalles: filas, 
                    totalCostoKm: totalKm,
                    totalCostoHora: totalHora 
                })
            });
           if (res.ok) {
                notifications.show({ title: 'Guardado', message: 'Estructura actualizada', color: 'green' });
            } else {
                // 👇 ESTO OBLIGA A SALTAR AL CATCH SI HAY ERROR 500 👇
                throw new Error('El servidor rechazó los datos'); 
            }
        } catch (e) {
            notifications.show({ title: 'Error', message: 'No se pudo guardar la estructura', color: 'red' });
        } finally { 
            setLoading(false); 
        }
    };

    const borrarMatriz = async () => {
        // Confirmación de seguridad nativa del navegador
        const confirmar = window.confirm("⚠️ ¿Estás seguro de eliminar esta Matriz? Se borrarán todos sus insumos y no se puede deshacer.");
        if (!confirmar) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/configuracion/matriz/${matrizId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                notifications.show({ title: 'Eliminada', message: 'Matriz borrada con éxito', color: 'green' });
                // Aquí podrías redirigir al usuario o limpiar la pantalla
                // router.push('/alguna-ruta'); 
            } else {
                throw new Error('Error al borrar');
            }
        } catch (e) {
            notifications.show({ title: 'Error', message: 'No se pudo eliminar la matriz', color: 'red' });
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
                    <Text c="dimmed" size="sm">Cálculo Dual de Costos (Rodamiento vs Tiempo)</Text>
                </div>
                <Group>
                    <Button 
                        leftSection={<IconTrash size={18}/>} 
                        color="red" 
                        variant="light" 
                        onClick={borrarMatriz}
                    >
                        Borrar Matriz
                    </Button>
                    <Button 
                        leftSection={<IconDeviceFloppy size={18}/>} 
                        color="blue" 
                        onClick={guardarCambios}
                    >
                        Guardar Cambios
                    </Button>
                </Group>
            </Group>

            {/* AHORA MOSTRAMOS DOS TARJETAS */}
            <Group grow mb="lg">
                <Card withBorder radius="md" bg="blue.0">
                    <Group justify="space-between">
                        <Group>
                            <IconCalculator size={24} color="gray" />
                            <div>
                                <Text fw={700}>Costo por Rodamiento</Text>
                                <Text size="xs" c="dimmed">Cauchos, Frenos, Tren Delantero</Text>
                            </div>
                        </Group>
                        <Badge size="xl" variant="filled" color="blue">
                            ${totalKm.toFixed(4)} / Km
                        </Badge>
                    </Group>
                </Card>
                <Card withBorder radius="md" bg="orange.0">
                    <Group justify="space-between">
                        <Group>
                            <IconCalculator size={24} color="gray" />
                            <div>
                                <Text fw={700}>Costo por Tiempo/Motor</Text>
                                <Text size="xs" c="dimmed">Baterías, Aceites, Seguros</Text>
                            </div>
                        </Group>
                        <Badge size="xl" variant="filled" color="orange">
                            ${totalHora.toFixed(2)} / Hora
                        </Badge>
                    </Group>
                </Card>
            </Group>

            <ScrollArea>
                <Table striped highlightOnHover withTableBorder miw={1000}>
                    <Table.Thead bg="gray.1">
                        <Table.Tr>
                            <Table.Th style={{ width: 200 }}>Descripción</Table.Th>
                            <Table.Th style={{ width: 90 }}>Und.</Table.Th>
                            <Table.Th style={{ width: 80 }}>Cant.</Table.Th>
                            <Table.Th style={{ width: 110 }}>Desgaste por</Table.Th>
                            <Table.Th style={{ width: 100 }}>Frecuencia</Table.Th>
                            <Table.Th style={{ width: 90 }}>Min ($)</Table.Th>
                            <Table.Th style={{ width: 90 }}>Prom ($)</Table.Th>
                            <Table.Th style={{ width: 90 }}>Max ($)</Table.Th>
                            <Table.Th style={{ width: 110, textAlign: 'right' }}>Aporte</Table.Th>
                            <Table.Th style={{ width: 50 }}></Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {filas.map((fila, i) => {
                            const desglose = calcularCostoFila(fila);
                            const esKm = fila.tipoDesgaste === 'km';
                            
                            return (
                                <Table.Tr key={i}>
                                    <Table.Td><TextInput variant="unstyled" value={fila.descripcion} onChange={(e) => updateFila(i, 'descripcion', e.target.value)} placeholder="Insumo" /></Table.Td>
                                    <Table.Td><TextInput variant="unstyled" value={fila.unidad} onChange={(e) => updateFila(i, 'unidad', e.target.value)} /></Table.Td>
                                    <Table.Td><NumberInput variant="unstyled" value={fila.cantidad} onChange={(val) => updateFila(i, 'cantidad', val)} min={0} /></Table.Td>
                                    <Table.Td>
                                        <Select 
                                            variant="unstyled" 
                                            value={fila.tipoDesgaste} 
                                            onChange={(val) => updateFila(i, 'tipoDesgaste', val)}
                                            data={[{value: 'km', label: 'Kilómetros'}, {value: 'horas', label: 'Horas (Motor)'}, {value: 'meses', label: 'Meses (Tiempo)'}]}
                                        />
                                    </Table.Td>
                                    <Table.Td><NumberInput variant="unstyled" value={fila.frecuencia} onChange={(val) => updateFila(i, 'frecuencia', val)} min={1} /></Table.Td>
                                    
                                    <Table.Td><NumberInput variant="unstyled" c="green.9" value={fila.costoMinimo} onChange={(val) => updateFila(i, 'costoMinimo', val)} min={0} decimalScale={2} /></Table.Td>
                                    <Table.Td><NumberInput variant="unstyled" fw={700} value={fila.costoUnitario} onChange={(val) => updateFila(i, 'costoUnitario', val)} min={0} decimalScale={2} /></Table.Td>
                                    <Table.Td><NumberInput variant="unstyled" c="red.9" value={fila.costoMaximo} onChange={(val) => updateFila(i, 'costoMaximo', val)} min={0} decimalScale={2} /></Table.Td>
                                    
                                    <Table.Td style={{ textAlign: 'right', fontWeight: 700, color: esKm ? '#228be6' : '#e8590c' }}>
                                        {esKm ? `$${desglose.km.toFixed(4)}/km` : `$${desglose.hora.toFixed(2)}/hr`}
                                    </Table.Td>
                                    <Table.Td><ActionIcon color="red" variant="subtle" onClick={() => removeFila(i)}><IconTrash size={16}/></ActionIcon></Table.Td>
                                </Table.Tr>
                            );
                        })}
                    </Table.Tbody>
                </Table>
            </ScrollArea>
            
            <Button variant="subtle" leftSection={<IconPlus size={16}/>} mt="sm" onClick={addFila}>Agregar Insumo</Button>
        </Paper>
    );
}