'use client';

import { useState, useMemo } from 'react';
import { 
    Paper, Title, ScrollArea, Table, Text, Badge, Group, Button, 
    Modal, Grid, Stack, ThemeIcon, Select, Progress 
} from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import { IconPlus, IconTrendingUp, IconFilter, IconCashBanknote } from '@tabler/icons-react';
import dayjs from 'dayjs';
import RegistroIngresoForm from './RegistroIngresoForm';

export default function TabIngresos({ listaIngresos, formatCurrency, getEstadoBadge, onRefresh }) {
    const [modalOpened, setModalOpened] = useState(false);
    const [filtroCategoria, setFiltroCategoria] = useState('Todas');

    const getColorOrigen = (origen) => {
        const colors = {
            'Flete': 'teal.6',
            'Servicio ODT': 'blue.6',
            'Venta Activo': 'grape.6',
            'Otros': 'gray.6'
        };
        return colors[origen] || 'teal.6';
    };

    // =========================================================
    // 🔥 MOTOR DE ANALÍTICA TÁCTICA (INGRESOS) 🔥
    // =========================================================
    
    // 1. Resumen por Origen de Capital
    const resumenIngresos = useMemo(() => {
        const sumatoria = {};
        let granTotal = 0;

        listaIngresos.forEach(ingreso => {
            const origen = ingreso.tipoOrigen || 'Otros';
            const monto = Number(ingreso.montoUsd) || 0;
            sumatoria[origen] = (sumatoria[origen] || 0) + monto;
            granTotal += monto;
        });

        const dataChart = Object.entries(sumatoria).map(([name, value]) => ({
            name,
            value,
            color: getColorOrigen(name),
            porcentaje: granTotal > 0 ? ((value / granTotal) * 100).toFixed(1) : 0
        })).sort((a, b) => b.value - a.value);

        return { data: dataChart, granTotal };
    }, [listaIngresos]);

    // 2. Detector de Ingreso Mayor (Big Ticket)
    const ingresoMasAlto = useMemo(() => {
        if (!listaIngresos || listaIngresos.length === 0) return null;
        return listaIngresos.reduce((prev, current) => 
            (Number(prev.montoUsd) > Number(current.montoUsd)) ? prev : current
        );
    }, [listaIngresos]);

    // 3. Aislamiento para la Tabla (Filtro)
    const ingresosFiltrados = useMemo(() => {
        if (filtroCategoria === 'Todas') return listaIngresos;
        return listaIngresos.filter(i => i.tipoOrigen === filtroCategoria);
    }, [listaIngresos, filtroCategoria]);

    const categoriasDisponibles = ['Todas', ...Array.from(new Set(listaIngresos.map(i => i.tipoOrigen)))];

    return (
        <div style={{ paddingTop: '24px' }}>
            
            {/* PANEL DE ANALÍTICA (TOP) */}
            {listaIngresos.length > 0 && (
                <Grid gutter="md" mb="xl">
                    {/* Donut Chart de Distribución */}
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <Paper withBorder p="xl" radius="md" shadow="sm" h="100%" display="flex" style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <Title order={5} mb="lg" c="dimmed" tt="uppercase" ls={1}>Fuentes de Capital</Title>
                            <DonutChart 
                                data={resumenIngresos.data} 
                                size={180} 
                                thickness={24}
                                tooltipDataSource="segment"
                                valueFormatter={(value) => formatCurrency(value)}
                            />
                            <Text mt="md" fw={900} size="xl" c="dark.8">{formatCurrency(resumenIngresos.granTotal)}</Text>
                            <Text size="xs" c="dimmed" fw={700}>INGRESOS TOTALES</Text>
                        </Paper>
                    </Grid.Col>

                    {/* Desglose de Progreso Top 4 */}
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <Paper withBorder p="md" radius="md" shadow="sm" h="100%">
                            <Title order={5} mb="md" c="dimmed" tt="uppercase" ls={1}>Motores de Liquidez</Title>
                            <Stack gap="xs">
                                {resumenIngresos.data.slice(0, 4).map((cat, idx) => (
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
                            </Stack>
                        </Paper>
                    </Grid.Col>

                    {/* Detector de Big Ticket */}
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        <Paper withBorder p="md" radius="md" shadow="sm" h="100%" style={{ borderTop: '4px solid var(--mantine-color-teal-6)' }}>
                            <Group gap="sm" mb="md">
                                <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                                    <IconTrendingUp size={20} />
                                </ThemeIcon>
                                <Title order={5} c="teal.8" tt="uppercase" ls={1}>Inyección Máxima</Title>
                            </Group>
                            
                            {ingresoMasAlto ? (
                                <Stack gap={4}>
                                    <Text size="xl" fw={900} c="teal.7" style={{ fontSize: '2rem' }}>
                                        {formatCurrency(ingresoMasAlto.montoUsd)}
                                    </Text>
                                    <Text size="sm" fw={700} lineClamp={1}>{ingresoMasAlto.descripcion || 'Sin descripción'}</Text>
                                    <Group gap="xs" mt="sm">
                                        <Badge color={getColorOrigen(ingresoMasAlto.tipoOrigen).split('.')[0]} variant="filled">
                                            {ingresoMasAlto.tipoOrigen}
                                        </Badge>
                                        <Text size="xs" c="dimmed" fw={600}>
                                            Cobrado el {dayjs(ingresoMasAlto.fechaIngreso).format('DD/MM/YYYY')}
                                        </Text>
                                    </Group>
                                    {ingresoMasAlto.cliente && (
                                        <Text size="xs" fw={700} c="gray.6" mt={4}>
                                            Cliente: {ingresoMasAlto.cliente.nombre || ingresoMasAlto.cliente.razonSocial}
                                        </Text>
                                    )}
                                </Stack>
                            ) : (
                                <Text size="sm" c="dimmed">No hay ingresos registrados.</Text>
                            )}
                        </Paper>
                    </Grid.Col>
                </Grid>
            )}

            {/* BARRA DE CONTROL DE LA TABLA */}
            <Group justify="space-between" mb="md" align="flex-end">
                <Group>
                    <ThemeIcon color="dark" size="lg" radius="md" variant="white">
                        <IconCashBanknote size={24} color="var(--mantine-color-teal-7)" />
                    </ThemeIcon>
                    <Title order={3} fw={800}>Libro de Ingresos Operativos</Title>
                </Group>
                
                <Group>
                    <Select
                        placeholder="Filtrar origen"
                        data={categoriasDisponibles}
                        value={filtroCategoria}
                        onChange={setFiltroCategoria}
                        leftSection={<IconFilter size={16} />}
                        style={{ width: 200 }}
                        variant="filled"
                    />
                    <Button 
                        color="teal" 
                        leftSection={<IconPlus size={16} />}
                        onClick={() => setModalOpened(true)}
                    >
                        Registrar Ingreso Manual
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
                                <Table.Th>Nro. Ref / Factura</Table.Th>
                                <Table.Th>Origen</Table.Th>
                                <Table.Th>Concepto / Cliente</Table.Th>
                                <Table.Th>Estado</Table.Th>
                                <Table.Th ta="right">Monto (USD)</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {ingresosFiltrados.length > 0 ? (
                                ingresosFiltrados.map((ingreso) => (
                                    <Table.Tr key={ingreso.id}>
                                        <Table.Td fw={600} c="dimmed">
                                            {dayjs(ingreso.fechaIngreso).format('DD/MM/YYYY')}
                                        </Table.Td>
                                        <Table.Td fw={700} c="gray.7">
                                            {ingreso.referenciaExterna || 'N/A'}
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge 
                                                variant="dot" 
                                                color={getColorOrigen(ingreso.tipoOrigen).split('.')[0]} 
                                                size="md"
                                            >
                                                {ingreso.tipoOrigen}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={600} lineClamp={1}>{ingreso.descripcion || 'Ingreso registrado'}</Text>
                                            {(ingreso.cliente || ingreso.fleteId) && (
                                                <Text size="xs" c="dimmed" mt={2}>
                                                    {ingreso.cliente ? `Cliente: ${ingreso.cliente.nombre || ingreso.cliente.razonSocial}` : `Flete Asociado: #${ingreso.fleteId}`}
                                                </Text>
                                            )}
                                        </Table.Td>
                                        <Table.Td>{getEstadoBadge(ingreso.estado)}</Table.Td>
                                        <Table.Td ta="right" fw={900} c="teal.7" style={{ fontSize: '1.1rem' }}>
                                            + {formatCurrency(ingreso.montoUsd)}
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            ) : (
                                <Table.Tr>
                                    <Table.Td colSpan={6} ta="center" py="xl" c="dimmed">
                                        No hay ingresos que coincidan con este filtro.
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
                title={<Title order={4} c="teal.8" fw={800}>Registrar Inyección de Capital</Title>}
                size="lg"
                overlayProps={{ blur: 3 }}
            >
                <RegistroIngresoForm 
                    onSuccess={() => {
                        setModalOpened(false);
                        if (onRefresh) onRefresh(); 
                    }} 
                />
            </Modal>
        </div>
    );
}