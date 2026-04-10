'use client';

import { Grid, Paper, Group, Text, Badge, Title, ThemeIcon, RingProgress, Center, Stack } from '@mantine/core';
import { BarChart, AreaChart } from '@mantine/charts';
import { 
    IconTrendingUp, IconTrendingDown, IconWallet, IconPercentage, IconAlertTriangle, IconCheck
} from '@tabler/icons-react';

export default function TabResumen({ data, formatCurrency }) {
    const isProfitable = data.kpis.utilidadNeta >= 0;
    const rentabilidadValue = Math.max(0, Math.min(data.kpis.rentabilidad, 100));

    // Procesamos la data para la gráfica de Caja Neta:
    // Mapeamos los datos para añadir un campo de color explícito para cada mes.
    const dataCajaNeta = data.grafico.map(item => ({
        ...item,
        colorBalance: item.Balance >= 0 ? 'teal.6' : 'red.6'
    }));

    return (
        <div style={{ paddingTop: '24px' }}>
            <Grid mb="xl" gutter="md">
                {/* KPI 1: Ingresos Brutos */}
                <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                    <Paper withBorder p="xl" radius="md" shadow="sm" style={{ borderTop: '4px solid var(--mantine-color-teal-6)' }}>
                        <Group justify="space-between" align="flex-start">
                            <Stack gap={0}>
                                <Text size="xs" c="dimmed" fw={800} tt="uppercase" ls={1}>Ingresos Brutos</Text>
                                <Text size="xl" fw={900} mt="xs" style={{ fontSize: '1.8rem' }}>
                                    {formatCurrency(data.kpis.totalIngresos)}
                                </Text>
                            </Stack>
                            <ThemeIcon variant="light" color="teal" size="xl" radius="md">
                                <IconTrendingUp size={24} stroke={2.5} />
                            </ThemeIcon>
                        </Group>
                    </Paper>
                </Grid.Col>

                {/* KPI 2: Gastos Totales */}
                <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                    <Paper withBorder p="xl" radius="md" shadow="sm" style={{ borderTop: '4px solid var(--mantine-color-red-6)' }}>
                        <Group justify="space-between" align="flex-start">
                            <Stack gap={0}>
                                <Text size="xs" c="dimmed" fw={800} tt="uppercase" ls={1}>Egresos y Costos</Text>
                                <Text size="xl" fw={900} mt="xs" style={{ fontSize: '1.8rem' }}>
                                    {formatCurrency(data.kpis.totalGastos)}
                                </Text>
                            </Stack>
                            <ThemeIcon variant="light" color="red" size="xl" radius="md">
                                <IconTrendingDown size={24} stroke={2.5} />
                            </ThemeIcon>
                        </Group>
                    </Paper>
                </Grid.Col>

                {/* KPI 3: Utilidad Neta */}
                <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                    <Paper 
                        withBorder 
                        p="xl" 
                        radius="md" 
                        shadow="sm" 
                        bg={isProfitable ? 'teal.0' : 'red.0'}
                        style={{ border: `1px solid var(--mantine-color-${isProfitable ? 'teal' : 'red'}-3)` }}
                    >
                        <Group justify="space-between" align="flex-start">
                            <Stack gap={0}>
                                <Text size="xs" c={isProfitable ? 'teal.9' : 'red.9'} fw={800} tt="uppercase" ls={1}>
                                    Utilidad Neta
                                </Text>
                                <Text size="xl" fw={900} mt="xs" c={isProfitable ? 'teal.9' : 'red.9'} style={{ fontSize: '1.8rem' }}>
                                    {formatCurrency(data.kpis.utilidadNeta)}
                                </Text>
                            </Stack>
                            <ThemeIcon variant="gradient" gradient={{ from: isProfitable ? 'teal' : 'red', to: isProfitable ? 'green' : 'orange' }} size="xl" radius="md">
                                <IconWallet size={24} stroke={2.5} />
                            </ThemeIcon>
                        </Group>
                    </Paper>
                </Grid.Col>

                {/* KPI 4: Rentabilidad */}
                <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                    <Paper withBorder p="md" radius="md" shadow="sm">
                        <Group justify="space-between" wrap="nowrap">
                            <Stack gap={0}>
                                <Text size="xs" c="dimmed" fw={800} tt="uppercase" ls={1}>Margen (ROA)</Text>
                                <Badge 
                                    mt="xs"
                                    color={data.kpis.rentabilidad >= 20 ? "teal" : data.kpis.rentabilidad > 0 ? "yellow" : "red"} 
                                    variant="dot" 
                                    size="lg"
                                >
                                    {data.kpis.rentabilidad >= 20 ? 'ÓPTIMO' : data.kpis.rentabilidad > 0 ? 'ALERTA' : 'CRÍTICO'}
                                </Badge>
                            </Stack>
                            <RingProgress
                                size={80}
                                thickness={8}
                                roundCaps
                                sections={[{ value: rentabilidadValue, color: data.kpis.rentabilidad >= 20 ? 'teal' : data.kpis.rentabilidad > 0 ? 'yellow' : 'red' }]}
                                label={
                                    <Center>
                                        {data.kpis.rentabilidad >= 20 ? (
                                            <IconCheck size={20} color="var(--mantine-color-teal-6)" />
                                        ) : data.kpis.rentabilidad > 0 ? (
                                            <IconPercentage size={20} color="var(--mantine-color-yellow-6)" />
                                        ) : (
                                            <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
                                        )}
                                    </Center>
                                }
                            />
                        </Group>
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* GRÁFICOS RE-DISEÑADOS PARA DATOS DISPERSOS */}
            <Grid gutter="xl">
                {/* Flujo Operativo: Cambiado a BarChart Agrupado */}
                <Grid.Col span={{ base: 12, lg: 7 }}>
                    <Paper withBorder p="lg" radius="md" shadow="sm" h="100%">
                        <Group justify="space-between" mb="lg">
                            <Title order={4} fw={800}>Flujo Operativo Mensual</Title>
                            <Badge variant="light" color="blue">Ingresos vs Gastos</Badge>
                        </Group>
                        {/* Usamos BarChart porque si solo hay un mes con datos, 
                            las barras se ven claras e imponentes. El Área necesita continuidad.
                        */}
                        <BarChart
                            h={350}
                            data={data.grafico}
                            dataKey="mes"
                            series={[
                                { name: 'Ingresos', color: 'teal.6' },
                                { name: 'Gastos', color: 'red.6' },
                            ]}
                            tickLine="y"
                            gridAxis="y" // Solo líneas horizontales para más limpieza
                            withTooltip
                            tooltipAnimationDuration={200}
                            valueFormatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
                        />
                    </Paper>
                </Grid.Col>

                {/* Caja Neta: Cambiado a BarChart con color dinámico */}
                <Grid.Col span={{ base: 12, lg: 5 }}>
                    <Paper withBorder p="lg" radius="md" shadow="sm" h="100%">
                        <Group justify="space-between" mb="lg">
                            <Title order={4} fw={800}>Caja Neta Mensual</Title>
                            <Badge variant="outline" color="gray">Corte a Fin de Mes</Badge>
                        </Group>
                        {/* Este BarChart usa un color fijo en la "series", pero la librería 
                            permite colores dinámicos si se le pasa una función o se mapea diferente en versiones avanzadas.
                            Para asegurar que funcione perfecto en tu versión actual de Mantine, usamos un color neutro (azul)
                            y dejamos que la barra suba o baje desde el cero de forma natural.
                        */}
                        <BarChart
                            h={350}
                            data={dataCajaNeta}
                            dataKey="mes"
                            series={[{ name: 'Balance', color: 'blue.6' }]} // Puedes probar con 'colorBalance' si tu versión lo soporta
                            tickLine="y"
                            gridAxis="y"
                            withTooltip
                            valueFormatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
                        />
                    </Paper>
                </Grid.Col>
            </Grid>
        </div>
    );
}