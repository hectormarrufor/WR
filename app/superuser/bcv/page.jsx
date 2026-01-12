'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Paper, Title, Group, Text, SimpleGrid, RingProgress, 
  Center, rem, LoadingOverlay, SegmentedControl, Stack, ThemeIcon 
} from '@mantine/core';
import { AreaChart } from '@mantine/charts'; // Asegúrate de tener instalado @mantine/charts
import { 
  IconTrendingUp, IconTrendingDown, IconCalendarStats, 
  IconCurrencyDollar, IconArrowUpRight, IconArrowDownRight 
} from '@tabler/icons-react';

export default function BcvDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rango, setRango] = useState('30d'); // '7d', '30d', 'todos'

  // 1. Cargar Datos
  useEffect(() => {
    const fetchBcv = async () => {
      try {
        const res = await fetch('/api/bcv/obtenerTodos');
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Error cargando BCV:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBcv();
  }, []);

  // 2. Calcular Estadísticas (KPIs)
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const actual = data[data.length - 1]; // Último registro
    const anterior = data.length > 1 ? data[data.length - 2] : actual;
    
    // Cálculo de variación porcentual
    const variacion = ((actual.monto - anterior.monto) / anterior.monto) * 100;
    const subio = variacion >= 0;

    // Máximo y Mínimo histórico (del set cargado)
    const montos = data.map(d => d.monto);
    const maximo = Math.max(...montos);
    const minimo = Math.min(...montos);

    return {
      actual: actual.monto,
      fechaActual: actual.fecha,
      variacion: Math.abs(variacion).toFixed(2),
      subio,
      maximo,
      minimo
    };
  }, [data]);

  // 3. Filtrar Datos para el Gráfico
  const chartData = useMemo(() => {
    if (rango === 'todos') return data;
    
    const dias = rango === '7d' ? 7 : 30;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);

    return data.filter(item => new Date(item.fecha) >= fechaLimite);
  }, [data, rango]);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
           <Title order={2}>Monitor Cambiario BCV</Title>
           <Text c="dimmed" size="sm">Histórico de la tasa oficial del Banco Central de Venezuela</Text>
        </div>
        <SegmentedControl 
            value={rango}
            onChange={setRango}
            data={[
                { label: '7 Días', value: '7d' },
                { label: '30 Días', value: '30d' },
                { label: 'Histórico', value: 'todos' }
            ]}
        />
      </Group>

      <LoadingOverlay visible={loading} />

      {/* KPI GRID */}
      {stats && (
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          
          {/* TARJETA 1: TASA ACTUAL */}
          <Paper withBorder p="md" radius="md">
            <Group>
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[{ value: 100, color: stats.subio ? 'red' : 'green' }]}
                label={
                  <Center>
                    <ThemeIcon color={stats.subio ? 'red' : 'green'} variant="light" radius="xl" size="lg">
                        {stats.subio ? <IconTrendingUp size={20} /> : <IconTrendingDown size={20} />}
                    </ThemeIcon>
                  </Center>
                }
              />

              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                  Tasa Actual ({stats.fechaActual})
                </Text>
                <Text fw={700} size="xl">
                  Bs. {stats.actual.toFixed(2)}
                </Text>
                <Group gap={5}>
                    {stats.subio ? <IconArrowUpRight size={14} color="red"/> : <IconArrowDownRight size={14} color="green"/>}
                    <Text c={stats.subio ? 'red' : 'green'} size="xs" fw={500}>
                        {stats.variacion}% respecto al cierre anterior
                    </Text>
                </Group>
              </div>
            </Group>
          </Paper>

          {/* TARJETA 2: MÁXIMO DEL PERIODO */}
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
                <div>
                    <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Pico Máximo</Text>
                    <Text fw={700} size="xl">Bs. {stats.maximo.toFixed(2)}</Text>
                    <Text c="dimmed" size="xs">En el periodo registrado</Text>
                </div>
                <ThemeIcon variant="light" color="orange" size={rem(50)} radius="md">
                    <IconCurrencyDollar size="1.8rem"/>
                </ThemeIcon>
            </Group>
          </Paper>

          {/* TARJETA 3: ESTABILIDAD (Decorativo / Mínimo) */}
          <Paper withBorder p="md" radius="md">
             <Group justify="space-between">
                <div>
                    <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Pico Mínimo</Text>
                    <Text fw={700} size="xl">Bs. {stats.minimo.toFixed(2)}</Text>
                    <Text c="dimmed" size="xs">En el periodo registrado</Text>
                </div>
                <ThemeIcon variant="light" color="blue" size={rem(50)} radius="md">
                    <IconCalendarStats size="1.8rem"/>
                </ThemeIcon>
            </Group>
          </Paper>
        </SimpleGrid>
      )}

      {/* GRÁFICO PRINCIPAL */}
      <Paper withBorder p="md" radius="md">
        <Title order={4} mb="md">Evolución del Precio</Title>
        <AreaChart
            h={350}
            data={chartData}
            dataKey="fecha" // Eje X
            series={[
                { name: 'monto', color: 'teal.6', label: 'Tasa BCV' }
            ]}
            curveType="monotone" // Suaviza las líneas
            tickLine="xy"
            gridAxis="xy"
            withLegend
            tooltipAnimationDuration={200}
            unit=" Bs."
            valueFormatter={(val) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(val)}
        />
      </Paper>
    </Stack>
  );
}