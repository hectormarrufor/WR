'use client';

import { useState, useEffect } from 'react';
import { 
    Container, Title, Grid, Paper, Text, Group, Stack, Badge, LoadingOverlay, Tabs, Table, ScrollArea 
} from '@mantine/core';
import { AreaChart, BarChart } from '@mantine/charts';
import { 
    IconTrendingUp, IconTrendingDown, IconWallet, IconPercentage, 
    IconChartBar, IconArrowDownRight, IconArrowUpRight 
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

export default function BalanceDashboard() {
    const [loading, setLoading] = useState(true);
    
    // Estados para la data
    const [data, setData] = useState({
        grafico: [],
        kpis: { totalIngresos: 0, totalGastos: 0, utilidadNeta: 0, rentabilidad: 0 }
    });
    const [listaIngresos, setListaIngresos] = useState([]);
    const [listaEgresos, setListaEgresos] = useState([]);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // 1. Fetch Balance
                const resBalance = await fetch('/api/balance');
                if (!resBalance.ok) throw new Error(`API Balance falló: ${resBalance.statusText}`);
                const jsonBalance = await resBalance.json();
                
                if (jsonBalance.success) {
                    setData(jsonBalance.data);
                } else {
                    throw new Error(jsonBalance.error);
                }

                // 2. Fetch Ingresos
                const resIngresos = await fetch('/api/ingresos');
                if (!resIngresos.ok) throw new Error(`API Ingresos falló: ${resIngresos.statusText}`);
                const jsonIngresos = await resIngresos.json();
                if (Array.isArray(jsonIngresos)) setListaIngresos(jsonIngresos);

                // 3. Fetch Gastos
                const resGastos = await fetch('/api/gastos-variables');
                if (!resGastos.ok) throw new Error(`API Gastos falló: ${resGastos.statusText}`);
                const jsonGastos = await resGastos.json();
                if (Array.isArray(jsonGastos)) setListaEgresos(jsonGastos);

            } catch (error) {
                // Imprimimos el error real en la consola F12 para que no andes a ciegas
                console.error("Error detallado en el Dashboard:", error);
                notifications.show({ 
                    title: 'Error de Conexión', 
                    message: error.message || 'Fallo al cargar la información financiera', 
                    color: 'red',
                    autoClose: 6000
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
    };

    const getEstadoBadge = (estado) => {
        switch (estado) {
            case 'Cobrado':
            case 'Pagado':
                return <Badge color="green" size="sm">{estado}</Badge>;
            case 'Pendiente':
                return <Badge color="orange" size="sm">{estado}</Badge>;
            case 'Anulado':
                return <Badge color="red" size="sm">{estado}</Badge>;
            default:
                return <Badge color="gray" size="sm">{estado}</Badge>;
        }
    };

    const isProfitable = data.kpis.utilidadNeta >= 0;

    return (
        <Container fluid p="md" pos="relative">
            <LoadingOverlay visible={loading} zIndex={1000} />
            
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>Balance Financiero (Año Actual)</Title>
                    <Text c="dimmed">Consolidado de Fletes vs Gastos Fijos y Variables</Text>
                </div>
            </Group>

            <Tabs defaultValue="resumen" variant="outline">
                <Tabs.List>
                    <Tabs.Tab value="resumen" leftSection={<IconChartBar size={16} />}>Resumen y Gráficos</Tabs.Tab>
                    <Tabs.Tab value="ingresos" leftSection={<IconArrowDownRight size={16} color="teal" />}>Libro de Ingresos</Tabs.Tab>
                    <Tabs.Tab value="egresos" leftSection={<IconArrowUpRight size={16} color="red" />}>Libro de Egresos</Tabs.Tab>
                </Tabs.List>

                {/* =========================================
                    TAB 1: RESUMEN Y GRÁFICOS (TU CÓDIGO ORIGINAL)
                ========================================= */}
                <Tabs.Panel value="resumen" pt="xl">
                    <Grid mb="xl">
                        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                            <Paper withBorder p="md" radius="md" shadow="sm">
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">Ingresos Brutos (Real)</Text>
                                    <IconTrendingUp size={20} color="green" />
                                </Group>
                                <Group align="flex-end" gap="xs" mt={25}>
                                    <Text size="xl" fw={700}>{formatCurrency(data.kpis.totalIngresos)}</Text>
                                </Group>
                            </Paper>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                            <Paper withBorder p="md" radius="md" shadow="sm">
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">Gastos Totales</Text>
                                    <IconTrendingDown size={20} color="red" />
                                </Group>
                                <Group align="flex-end" gap="xs" mt={25}>
                                    <Text size="xl" fw={700}>{formatCurrency(data.kpis.totalGastos)}</Text>
                                </Group>
                            </Paper>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                            <Paper withBorder p="md" radius="md" shadow="sm">
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">Utilidad Neta</Text>
                                    <IconWallet size={20} color={isProfitable ? "teal" : "red"} />
                                </Group>
                                <Group align="flex-end" gap="xs" mt={25}>
                                    <Text size="xl" fw={700} c={isProfitable ? "teal.6" : "red.6"}>
                                        {formatCurrency(data.kpis.utilidadNeta)}
                                    </Text>
                                </Group>
                            </Paper>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                            <Paper withBorder p="md" radius="md" shadow="sm">
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">Rentabilidad Anual</Text>
                                    <IconPercentage size={20} color={data.kpis.rentabilidad >= 20 ? "teal" : "orange"} />
                                </Group>
                                <Group align="flex-end" gap="xs" mt={25}>
                                    <Text size="xl" fw={700}>
                                        {data.kpis.rentabilidad.toFixed(2)}%
                                    </Text>
                                    <Badge color={data.kpis.rentabilidad >= 20 ? "teal" : "orange"} variant="light">
                                        MARGEN
                                    </Badge>
                                </Group>
                            </Paper>
                        </Grid.Col>
                    </Grid>

                    <Grid gutter="xl">
                        <Grid.Col span={{ base: 12, lg: 8 }}>
                            <Paper withBorder p="lg" radius="md" shadow="sm">
                                <Title order={4} mb="md">Evolución: Ingresos vs Gastos</Title>
                                <AreaChart
                                    h={350}
                                    data={data.grafico}
                                    dataKey="mes"
                                    series={[
                                        { name: 'Ingresos', color: 'teal.6' },
                                        { name: 'Gastos', color: 'red.6' },
                                    ]}
                                    curveType="monotone"
                                    tickLine="y"
                                    gridAxis="xy"
                                    valueFormatter={(value) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(value)}
                                />
                            </Paper>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, lg: 4 }}>
                            <Paper withBorder p="lg" radius="md" shadow="sm">
                                <Title order={4} mb="md">Balance Neto Mensual</Title>
                                <BarChart
                                    h={350}
                                    data={data.grafico}
                                    dataKey="mes"
                                    series={[{ name: 'Balance', color: 'blue.6' }]}
                                    tickLine="y"
                                    valueFormatter={(value) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(value)}
                                />
                            </Paper>
                        </Grid.Col>
                    </Grid>
                </Tabs.Panel>

                {/* =========================================
                    TAB 2: LIBRO DE INGRESOS (VENTAS / COBROS)
                ========================================= */}
                <Tabs.Panel value="ingresos" pt="xl">
                    <Paper withBorder radius="md" shadow="sm" p="md">
                        <Title order={4} mb="md" c="teal.7">Libro de Ingresos Operativos</Title>
                        <ScrollArea>
                            <Table striped highlightOnHover verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Fecha</Table.Th>
                                        <Table.Th>Nro. Ref / Factura</Table.Th>
                                        <Table.Th>Concepto / Origen</Table.Th>
                                        <Table.Th>Cliente asociado</Table.Th>
                                        <Table.Th>Estado</Table.Th>
                                        <Table.Th ta="right">Monto (USD)</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {listaIngresos.length > 0 ? (
                                        listaIngresos.map((ingreso) => (
                                            <Table.Tr key={ingreso.id}>
                                                <Table.Td>{dayjs(ingreso.fechaIngreso).format('DD/MM/YYYY')}</Table.Td>
                                                <Table.Td fw={500}>{ingreso.referenciaExterna || 'N/A'}</Table.Td>
                                                <Table.Td>
                                                    <Text size="sm" fw={600}>{ingreso.tipoOrigen}</Text>
                                                    <Text size="xs" c="dimmed" lineClamp={1}>{ingreso.descripcion}</Text>
                                                </Table.Td>
                                                <Table.Td>{ingreso.cliente?.nombre || ingreso.cliente?.razonSocial || 'N/A'}</Table.Td>
                                                <Table.Td>{getEstadoBadge(ingreso.estado)}</Table.Td>
                                                <Table.Td ta="right" fw={700} c="teal.7">
                                                    {formatCurrency(ingreso.montoUsd)}
                                                </Table.Td>
                                            </Table.Tr>
                                        ))
                                    ) : (
                                        <Table.Tr>
                                            <Table.Td colSpan={6} ta="center" py="xl" c="dimmed">No hay ingresos registrados.</Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                    </Paper>
                </Tabs.Panel>

                {/* =========================================
                    TAB 3: LIBRO DE EGRESOS (GASTOS VARIABLES)
                ========================================= */}
                <Tabs.Panel value="egresos" pt="xl">
                    <Paper withBorder radius="md" shadow="sm" p="md">
                        <Title order={4} mb="md" c="red.7">Libro de Egresos y Compras</Title>
                        <ScrollArea>
                            <Table striped highlightOnHover verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Fecha</Table.Th>
                                        <Table.Th>Referencia</Table.Th>
                                        <Table.Th>Categoría</Table.Th>
                                        <Table.Th>Descripción del Gasto</Table.Th>
                                        <Table.Th>Estado</Table.Th>
                                        <Table.Th ta="right">Monto (USD)</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {listaEgresos.length > 0 ? (
                                        listaEgresos.map((gasto) => (
                                            <Table.Tr key={gasto.id}>
                                                <Table.Td>{dayjs(gasto.fechaGasto).format('DD/MM/YYYY')}</Table.Td>
                                                <Table.Td fw={500}>{gasto.referenciaExterna || 'N/A'}</Table.Td>
                                                <Table.Td>
                                                    <Badge variant="light" color="blue" radius="sm">
                                                        {gasto.tipoOrigen}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm" lineClamp={2}>{gasto.descripcion || 'Sin detalle'}</Text>
                                                </Table.Td>
                                                <Table.Td>{getEstadoBadge(gasto.estado)}</Table.Td>
                                                <Table.Td ta="right" fw={700} c="red.7">
                                                    - {formatCurrency(gasto.montoUsd)}
                                                </Table.Td>
                                            </Table.Tr>
                                        ))
                                    ) : (
                                        <Table.Tr>
                                            <Table.Td colSpan={6} ta="center" py="xl" c="dimmed">No hay gastos variables registrados.</Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                    </Paper>
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
}