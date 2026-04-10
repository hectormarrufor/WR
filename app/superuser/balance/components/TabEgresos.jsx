'use client';

import { useState, useMemo } from 'react';
import { 
    Paper, Title, ScrollArea, Table, Text, Badge, Group, Button, 
    Modal, Grid, Stack, ThemeIcon, Select, Progress 
} from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import { IconPlus, IconFlame, IconFilter, IconReportMoney } from '@tabler/icons-react';
import dayjs from 'dayjs';
import RegistroEgresoGeneralForm from './RegistroEgresoGeneralForm';

export default function TabEgresos({ listaEgresos, formatCurrency, getEstadoBadge, onRefresh }) {
    const [modalOpened, setModalOpened] = useState(false);
    const [filtroCategoria, setFiltroCategoria] = useState('Todas');

    // Mapeo estricto de colores para mantener coherencia visual entre gráfica y tabla
    const getColorCategoria = (cat) => {
        const colors = {
            'Nomina': 'violet.6',
            'Compra Repuestos': 'orange.6',
            'Servicio Externo': 'yellow.6',
            'Combustible': 'red.6',
            'Viaticos': 'grape.6',
            'Impuestos': 'pink.6',
            'Gastos Adm': 'cyan.6',
            'Peajes': 'teal.6',
            'Obligación Fija': 'indigo.6',
            'Otros': 'gray.6'
        };
        return colors[cat] || 'blue.6';
    };

    // =========================================================
    // 🔥 MOTOR DE ANALÍTICA TÁCTICA 🔥
    // =========================================================
    
    // 1. Resumen por Categorías (Para el Donut Chart y Barras de Progreso)
    const resumenCategorias = useMemo(() => {
        const sumatoria = {};
        let granTotal = 0;

        listaEgresos.forEach(gasto => {
            const cat = gasto.tipoOrigen || 'Otros';
            const monto = Number(gasto.montoUsd) || 0;
            sumatoria[cat] = (sumatoria[cat] || 0) + monto;
            granTotal += monto;
        });

        // Convertir a formato que lee el DonutChart y ordenar de mayor a menor
        const dataChart = Object.entries(sumatoria).map(([name, value]) => ({
            name,
            value,
            color: getColorCategoria(name),
            porcentaje: granTotal > 0 ? ((value / granTotal) * 100).toFixed(1) : 0
        })).sort((a, b) => b.value - a.value);

        return { data: dataChart, granTotal };
    }, [listaEgresos]);

    // 2. Detector de Gasto Mayor (Big Ticket)
    const gastoMasAlto = useMemo(() => {
        if (!listaEgresos || listaEgresos.length === 0) return null;
        return listaEgresos.reduce((prev, current) => 
            (Number(prev.montoUsd) > Number(current.montoUsd)) ? prev : current
        );
    }, [listaEgresos]);

    // 3. Aislamiento para la Tabla (Filtro)
    const egresosFiltrados = useMemo(() => {
        if (filtroCategoria === 'Todas') return listaEgresos;
        return listaEgresos.filter(e => e.tipoOrigen === filtroCategoria);
    }, [listaEgresos, filtroCategoria]);

    // Extraer categorías únicas para el filtro
    const categoriasDisponibles = ['Todas', ...Array.from(new Set(listaEgresos.map(e => e.tipoOrigen)))];

    return (
        <div style={{ paddingTop: '24px' }}>
            
            {/* PANEL DE ANALÍTICA (TOP) */}
            {listaEgresos.length > 0 && (
                <Grid gutter="md" mb="xl">
                    {/* Donut Chart de Distribución */}
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <Paper withBorder p="xl" radius="md" shadow="sm" h="100%" display="flex" style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <Title order={5} mb="lg" c="dimmed" tt="uppercase" ls={1}>Distribución de Capital</Title>
                            <DonutChart 
                                data={resumenCategorias.data} 
                                size={180} 
                                thickness={24}
                                tooltipDataSource="segment"
                                valueFormatter={(value) => formatCurrency(value)}
                            />
                            <Text mt="md" fw={900} size="xl" c="dark.8">{formatCurrency(resumenCategorias.granTotal)}</Text>
                            <Text size="xs" c="dimmed" fw={700}>EGRESOS TOTALES</Text>
                        </Paper>
                    </Grid.Col>

                    {/* Desglose de Progreso Top 4 */}
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <Paper withBorder p="md" radius="md" shadow="sm" h="100%">
                            <Title order={5} mb="md" c="dimmed" tt="uppercase" ls={1}>Top Fugas de Efectivo</Title>
                            <Stack gap="xs">
                                {resumenCategorias.data.slice(0, 4).map((cat, idx) => (
                                    <div key={idx}>
                                        <Group justify="space-between" mb={4}>
                                            <Text size="sm" fw={700}>{cat.name}</Text>
                                            <Group gap="xs">
                                                <Text size="sm" fw={800}>{formatCurrency(cat.value)}</Text>
                                                <Badge size="xs" color="gray" variant="light">{cat.porcentaje}%</Badge>
                                            </Group>
                                        </Group>
                                        <Progress value={cat.porcentaje} color={cat.color} size="sm" radius="xl" />
                                    </div>
                                ))}
                                {resumenCategorias.data.length === 0 && (
                                    <Text size="sm" c="dimmed" fs="italic">Sin datos suficientes.</Text>
                                )}
                            </Stack>
                        </Paper>
                    </Grid.Col>

                    {/* Detector de Big Ticket */}
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <Paper withBorder p="md" radius="md" shadow="sm" h="100%" style={{ borderTop: '4px solid var(--mantine-color-red-6)' }}>
                            <Group gap="sm" mb="md">
                                <ThemeIcon color="red" variant="light" size="lg" radius="md">
                                    <IconFlame size={20} />
                                </ThemeIcon>
                                <Title order={5} c="red.8" tt="uppercase" ls={1}>Gasto Unitario Máximo</Title>
                            </Group>
                            
                            {gastoMasAlto ? (
                                <Stack gap={4}>
                                    <Text size="xl" fw={900} c="red.7" style={{ fontSize: '2rem' }}>
                                        {formatCurrency(gastoMasAlto.montoUsd)}
                                    </Text>
                                    <Text size="sm" fw={700} lineClamp={1}>{gastoMasAlto.descripcion}</Text>
                                    <Group gap="xs" mt="sm">
                                        <Badge color={getColorCategoria(gastoMasAlto.tipoOrigen)} variant="filled">
                                            {gastoMasAlto.tipoOrigen}
                                        </Badge>
                                        <Text size="xs" c="dimmed" fw={600}>
                                            Pagado el {dayjs(gastoMasAlto.fechaGasto).format('DD/MM/YYYY')}
                                        </Text>
                                    </Group>
                                </Stack>
                            ) : (
                                <Text size="sm" c="dimmed">No hay gastos registrados.</Text>
                            )}
                        </Paper>
                    </Grid.Col>
                </Grid>
            )}

            {/* BARRA DE CONTROL DE LA TABLA */}
            <Group justify="space-between" mb="md" align="flex-end">
                <Group>
                    <ThemeIcon color="dark" size="lg" radius="md" variant="white">
                        <IconReportMoney size={24} />
                    </ThemeIcon>
                    <Title order={3} fw={800}>Libro Diario de Egresos</Title>
                </Group>
                
                <Group>
                    <Select
                        placeholder="Filtrar categoría"
                        data={categoriasDisponibles}
                        value={filtroCategoria}
                        onChange={setFiltroCategoria}
                        leftSection={<IconFilter size={16} />}
                        style={{ width: 200 }}
                        variant="filled"
                    />
                    <Button 
                        color="red" 
                        leftSection={<IconPlus size={16} />}
                        onClick={() => setModalOpened(true)}
                    >
                        Registrar Salida de Dinero
                    </Button>
                </Group>
            </Group>

            {/* TABLA PRINCIPAL */}
            <Paper withBorder radius="md" shadow="sm" p="md">
                <ScrollArea>
                    <Table striped highlightOnHover verticalSpacing="md">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Fecha</Table.Th>
                                <Table.Th>Categoría</Table.Th>
                                <Table.Th>Descripción del Gasto</Table.Th>
                                <Table.Th>Referencia / Recibo</Table.Th>
                                <Table.Th>Estado</Table.Th>
                                <Table.Th ta="right">Monto (USD)</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {egresosFiltrados.length > 0 ? (
                                egresosFiltrados.map((gasto) => (
                                    <Table.Tr key={gasto.id}>
                                        <Table.Td fw={600} c="dimmed">
                                            {dayjs(gasto.fechaGasto).format('DD/MM/YYYY')}
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge 
                                                variant="dot" 
                                                color={getColorCategoria(gasto.tipoOrigen).split('.')[0]} 
                                                size="md"
                                            >
                                                {gasto.tipoOrigen}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={600} lineClamp={2}>{gasto.descripcion || 'Sin detalle'}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="xs" fw={700} c="gray.6">{gasto.referenciaExterna || 'N/A'}</Text>
                                        </Table.Td>
                                        <Table.Td>{getEstadoBadge(gasto.estado)}</Table.Td>
                                        <Table.Td ta="right" fw={800} c="red.7" style={{ fontSize: '1.1rem' }}>
                                            - {formatCurrency(gasto.montoUsd)}
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            ) : (
                                <Table.Tr>
                                    <Table.Td colSpan={6} ta="center" py="xl" c="dimmed">
                                        No hay egresos que coincidan con este filtro.
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Paper>

            {/* MODAL DE REGISTRO */}
            <Modal 
                opened={modalOpened} 
                onClose={() => setModalOpened(false)} 
                title={<Title order={4} c="red.8" fw={800}>Registrar Egreso Maestro</Title>}
                size="lg"
                overlayProps={{ blur: 3 }}
            >
                <RegistroEgresoGeneralForm 
                    onSuccess={() => {
                        setModalOpened(false);
                        if (onRefresh) onRefresh(); 
                    }} 
                />
            </Modal>
        </div>
    );
}