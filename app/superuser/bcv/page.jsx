'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Paper, Title, Group, Text, SimpleGrid, 
  LoadingOverlay, SegmentedControl, Stack, ThemeIcon, Badge, Tooltip
} from '@mantine/core';
import { LineChart } from '@mantine/charts';
import {
  IconCurrencyDollar, IconCurrencyEuro, IconCoin,
  IconArrowUpRight, IconArrowDownRight, IconScale, IconChartBar
} from '@tabler/icons-react';
import '@mantine/charts/styles.css';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
dayjs.locale('es');

export default function BcvDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rango, setRango] = useState('30d');
  const [mounted, setMounted] = useState(false);

  // 1. Cargar Datos
  useEffect(() => {
    setMounted(true);
    const fetchBcv = async () => {
      try {
        const res = await fetch('/api/bcv/obtenerTodos');
        const result = await res.json();
        if (result.success) setData(result.data);
      } catch (error) {
        console.error("Error cargando BCV:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBcv();
  }, []);

  // 2. Filtrar Datos según el Rango (Vital para el promedio)
  const chartData = useMemo(() => {
    if (rango === 'todos') return data;
    const dias = rango === '7d' ? 7 : 30;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    return data.filter(item => new Date(item.fecha) >= fechaLimite);
  }, [data, rango]);

  // 3. Calcular Estadísticas y Spreads
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    // A. Datos del día actual y anterior (para variación USD)
    const actual = data[data.length - 1];
    const anterior = data.length > 1 ? data[data.length - 2] : actual;

    // B. Variación diaria solo para USD (Base)
    const varUsd = ((actual.monto - anterior.monto) / anterior.monto) * 100;

    // C. Helper para calcular Spread vs USD
    // Fórmula: ((Moneda - USD) / USD) * 100
    const calcSpread = (target, base) => {
        if (!base || !target) return 0;
        return ((target - base) / base) * 100;
    };

    // Spread Actual (Hoy)
    const spreadEurHoy = calcSpread(actual.montoEur, actual.monto);
    const spreadUsdtHoy = calcSpread(actual.montoUsdt, actual.monto);

    // D. Calcular Spread Promedio del Periodo Seleccionado
    // Iteramos sobre 'chartData' que ya está filtrado por fecha
    let sumaSpreadEur = 0;
    let sumaSpreadUsdt = 0;
    let countEur = 0;
    let countUsdt = 0;

    chartData.forEach(item => {
        if (item.monto > 0) {
            if (item.montoEur > 0) {
                sumaSpreadEur += calcSpread(item.montoEur, item.monto);
                countEur++;
            }
            if (item.montoUsdt > 0) {
                sumaSpreadUsdt += calcSpread(item.montoUsdt, item.monto);
                countUsdt++;
            }
        }
    });

    return {
      fecha: actual.fecha,
      usd: {
        monto: actual.monto,
        variacion: Math.abs(varUsd).toFixed(2),
        subio: varUsd >= 0
      },
      eur: {
        monto: actual.montoEur,
        spreadHoy: spreadEurHoy.toFixed(2),
        spreadPromedio: countEur > 0 ? (sumaSpreadEur / countEur).toFixed(2) : 0
      },
      usdt: {
        monto: actual.montoUsdt,
        spreadHoy: spreadUsdtHoy.toFixed(2),
        spreadPromedio: countUsdt > 0 ? (sumaSpreadUsdt / countUsdt).toFixed(2) : 0
      }
    };
  }, [data, chartData]); // Dependemos de chartData para recalcular promedios al cambiar filtro

  // Componente de Tarjeta
  const CurrencyCard = ({ title, amount, mainMetric, secondaryMetric, isBaseCurrency, icon: Icon, color }) => (
    <Paper withBorder p="md" radius="md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <Group justify="space-between" align="flex-start" mb="xs">
          <div>
            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{title}</Text>
            <Text fw={700} size="xl" style={{ lineHeight: 1 }}>Bs. {amount?.toFixed(2)}</Text>
          </div>
          <ThemeIcon variant="light" color={color} size="lg" radius="md">
            <Icon size="1.2rem" />
          </ThemeIcon>
        </Group>
      </div>
      
      <Stack gap="xs" mt="sm">
        {/* Métrica Principal: Variación Diaria (USD) o Spread Actual (EUR/USDT) */}
        <Group gap={5} align="center">
            {isBaseCurrency ? (
                // Lógica para USD (Variación diaria)
                <>
                    {mainMetric.subio ? <IconArrowUpRight size={16} color="red" /> : <IconArrowDownRight size={16} color="green" />}
                    <Text size="sm" c={mainMetric.subio ? 'red' : 'green'} fw={600}>
                        {mainMetric.val}%
                    </Text>
                    <Text size="xs" c="dimmed">vs ayer</Text>
                </>
            ) : (
                // Lógica para EUR/USDT (Spread vs USD)
                <Tooltip label="Porcentaje por encima del Dólar BCV hoy">
                    <Group gap={4} style={{ cursor: 'help' }}>
                        <IconScale size={16} color="gray" />
                        <Text size="sm" fw={600} c="dark.3">
                            Spread: <Text span c={color} fw={700}>+{mainMetric}%</Text>
                        </Text>
                    </Group>
                </Tooltip>
            )}
        </Group>

        {/* Métrica Secundaria: Promedio del periodo (Solo para EUR/USDT) */}
        {!isBaseCurrency && (
             <Badge variant="light" color="gray" size="sm" leftSection={<IconChartBar size={10}/>} fullWidth>
                Promedio {rango === 'todos' ? 'Hist.' : rango}: +{secondaryMetric}%
             </Badge>
        )}
      </Stack>
    </Paper>
  );

  if (!mounted) return <LoadingOverlay visible />;

  return (
    <Paper p="md" radius="md">
      <Stack gap="lg">
        {/* HEADER */}
        <Group justify="space-between" wrap="wrap">
          <div>
            <Title order={2}>Monitor Cambiario</Title>
            <Text c="dimmed" size="sm">Análisis de brechas (Spread) respecto al Dólar BCV</Text>
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

        {/* KPI CARDS */}
        {stats && (
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {/* TARJETA USD (BASE) */}
            <CurrencyCard 
              title="Dólar BCV (Base)" 
              amount={stats.usd.monto} 
              isBaseCurrency={true}
              mainMetric={{ val: stats.usd.variacion, subio: stats.usd.subio }}
              icon={IconCurrencyDollar}
              color="blue"
            />
            
            {/* TARJETA EURO */}
            <CurrencyCard 
              title="Euro BCV" 
              amount={stats.eur.monto} 
              isBaseCurrency={false}
              mainMetric={stats.eur.spreadHoy}        // Spread Hoy
              secondaryMetric={stats.eur.spreadPromedio} // Promedio Periodo
              icon={IconCurrencyEuro}
              color="orange"
            />

            {/* TARJETA USDT */}
            <CurrencyCard 
              title="USDT (Binance)" 
              amount={stats.usdt.monto} 
              isBaseCurrency={false}
              mainMetric={stats.usdt.spreadHoy}       // Spread Hoy
              secondaryMetric={stats.usdt.spreadPromedio} // Promedio Periodo
              icon={IconCoin}
              color="teal"
            />
          </SimpleGrid>
        )}

        {/* GRÁFICO */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="md">
             <Title order={4}>Evolución de Tasas</Title>
             <Badge variant="outline" color="gray">{chartData.length} registros</Badge>
          </Group>

          <LineChart
            h={350}
            data={chartData}
            dataKey="fecha"
            series={[
              { name: 'monto', label: 'USD BCV', color: 'blue.6' },
              { name: 'montoEur', label: 'EUR BCV', color: 'orange.6' },
              { name: 'montoUsdt', label: 'USDT Binance', color: 'teal.6' }
            ]}
            tickLine="xy"
            gridAxis="xy"
            xAxisProps={{
              tickFormatter: (value) => dayjs(value).format('DD MMM'), 
            }}
            yAxisProps={{ 
                domain: ['auto', 'auto'],
                tickFormatter: (value) => `${value}`
            }}
            valueFormatter={(val) => `Bs. ${val.toFixed(2)}`}
            dotProps={{ r: 3, strokeWidth: 1 }}
            activeDotProps={{ r: 5, strokeWidth: 1 }}
            tooltipAnimationDuration={200}
            strokeWidth={3}
            lineProps={{
            label: { 
              fill: '#495057', 
              fontSize: 12,     // <--- AQUÍ CONTROLAS EL TAMAÑO
              fontWeight: 700,  // Negrita para resaltar
              position: 'top',  // Ubicación sobre el punto
              offset: 10,       // Espacio entre el punto y el texto
              formatter: (val) => val.toFixed(0) 
            } }}
            withPointLabels
            legendProps={{ verticalAlign: 'bottom', height: 50 }}
            curveType="monotone"
            withLegend
            withTooltip
          />
        </Paper>
      </Stack>
    </Paper>
  );
}