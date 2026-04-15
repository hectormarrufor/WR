'use client';

import { useMemo } from 'react';
import { Paper, Text, Group, Box, Badge, ThemeIcon, Stack, Center } from '@mantine/core';
import { LineChart } from '@mantine/charts';
import { IconChartLine, IconDatabase, IconGeometry } from '@tabler/icons-react';

// --- LÓGICA MATEMÁTICA CENTRALIZADA ---
const calcularLitros = (cmEval, config) => {
    if (!config || isNaN(cmEval) || cmEval < 0) return 0;

    const { tipoForma, dimensiones, tablaAforo } = config;
    const { largo, diametro, ancho, alto, altoRecto, anchoSuperior, cantidadTanques } = dimensiones || {};
    const L = parseFloat(largo) || 0;
    const qty = parseInt(cantidadTanques) || 1;

    // 1. Prioridad: Aforo Manual o Radial (Iveco)
    if ((tablaAforo && tablaAforo.length > 0) || tipoForma === 'radial_total') {
        const aforo = [...(tablaAforo || [])].sort((a, b) => a.cm - b.cm);
        if (aforo.length === 0) return 0;
        
        if (cmEval <= aforo[0].cm) return aforo[0].litros * qty;
        if (cmEval >= aforo[aforo.length - 1].cm) return aforo[aforo.length - 1].litros * qty;

        for (let i = 0; i < aforo.length - 1; i++) {
            const p1 = aforo[i];
            const p2 = aforo[i+1];
            if (cmEval >= p1.cm && cmEval <= p2.cm) {
                const pendiente = (p2.litros - p1.litros) / (p2.cm - p1.cm);
                return (p1.litros + pendiente * (cmEval - p1.cm)) * qty;
            }
        }
    }

    // 2. Geometrías Teóricas
    if (tipoForma === 'cilindrico') {
        const D = parseFloat(diametro) || 0;
        if (D === 0) return 0;
        const h = Math.min(cmEval, D);
        const R = D / 2;
        const area = (Math.pow(R, 2) * Math.acos((R - h) / R)) - ((R - h) * Math.sqrt((2 * R * h) - Math.pow(h, 2)));
        return ((area * L) / 1000) * qty;
    } 
    
    if (tipoForma === 'rectangular') {
        const H = parseFloat(alto) || 0;
        const h = Math.min(cmEval, H);
        return ((L * (parseFloat(ancho) || 0) * h) / 1000) * qty;
    }

    if (tipoForma === 'chaflan_superior') {
        const H_total = parseFloat(alto) || 0;
        const H_rect = parseFloat(altoRecto) || 0;
        const W_base = parseFloat(ancho) || 0;
        const W_top = parseFloat(anchoSuperior) || 0;
        const h = Math.min(cmEval, H_total);

        let area = 0;
        if (h <= H_rect) {
            area = W_base * h;
        } else {
            const h_trap = h - H_rect;
            const W_h = W_base - ((W_base - W_top) * (h_trap / (H_total - H_rect)));
            area = (W_base * H_rect) + (((W_base + W_h) / 2) * h_trap);
        }
        return ((area * L) / 1000) * qty;
    }

    return 0;
};

export default function CardGraficaTanque({ activo }) {
    const config = activo?.configuracionTanque 
            || activo?.vehiculoInstancia?.plantilla?.configuracionTanque 
            || activo?.maquinaInstancia?.plantilla?.configuracionTanque 
            || activo?.remolqueInstancia?.plantilla?.configuracionTanque;

    // Determinar origen y tope
    const { labelOrigen, iconOrigen, colorOrigen, topeCm } = useMemo(() => {
        if (!config) return { labelOrigen: 'Sin Configuración', topeCm: 0 };
        
        let label = '';
        let icon = <IconGeometry size={14} />;
        let color = 'blue';
        let tope = 0;

        if (config.tipoForma === 'radial_total') {
            label = 'Tabla de Aforo (Iveco)';
            icon = <IconDatabase size={14} />;
            color = 'indigo';
        } else if (config.tablaAforo?.length > 0) {
            label = 'Aforo Manual Referenciado';
            icon = <IconDatabase size={14} />;
            color = 'teal';
        } else {
            const nombres = {
                cilindrico: 'Geometría Cilíndrica',
                rectangular: 'Geometría Rectangular',
                chaflan_superior: 'Geometría con Chaflán'
            };
            label = nombres[config.tipoForma] || 'Geometría Desconocida';
            color = 'blue';
        }

        // Calcular altura máxima para el eje X
        if (config.tipoForma === 'radial_total' || config.tablaAforo?.length > 0) {
            const aforo = [...(config.tablaAforo || [])].sort((a, b) => a.cm - b.cm);
            tope = aforo.length > 0 ? aforo[aforo.length - 1].cm : 0;
        } else {
            tope = config.tipoForma === 'cilindrico' ? config.dimensiones?.diametro : config.dimensiones?.alto;
        }

        return { labelOrigen: label, iconOrigen: icon, colorOrigen: color, topeCm: parseFloat(tope) || 0 };
    }, [config]);

    // Generar datos de la gráfica
    const chartData = useMemo(() => {
        if (!config || topeCm <= 0) return [];
        const puntos = [];
        for (let i = 0; i <= Math.ceil(topeCm); i++) {
            puntos.push({
                cmLabel: String(i),
                litros: Math.round(calcularLitros(i, config))
            });
        }
        return puntos;
    }, [config, topeCm]);

    if (!config) return null;

    return (
        <Paper withBorder p="md" radius="md" bg="gray.0">
            <Stack gap="xs">
                <Group justify="space-between">
                    <Group gap="sm">
                        <ThemeIcon variant="light" color="blue" size="md">
                            <IconChartLine size={18} />
                        </ThemeIcon>
                        <Text fw={700} size="sm">Curva de Capacidad del Tanque</Text>
                    </Group>
                    <Badge variant="light" color={colorOrigen} leftSection={iconOrigen}>
                        {labelOrigen}
                    </Badge>
                </Group>

                <Box h={250} mt="md">
                    {chartData.length > 0 ? (
                        <LineChart
                            h={250}
                            data={chartData}
                            dataKey="cmLabel"
                            series={[{ name: 'litros', label: 'Litros', color: 'blue.6' }]}
                            curveType={config.tipoForma === 'cilindrico' ? 'monotone' : 'linear'}
                            withDots={false}
                            tickLine="xy"
                            gridAxis="xy"
                            yAxisProps={{ tickFormatter: (value) => `${value}L` }}
                            valueFormatter={(val) => `${val} Litros`}
                            strokeWidth={3}
                        />
                    ) : (
                        <Center h="100%">
                            <Text size="xs" c="dimmed" fs="italic">Faltan dimensiones para renderizar la curva</Text>
                        </Center>
                    )}
                </Box>
                
                <Group justify="center" mt="xs">
                    <Text size="xs" c="dimmed">
                        Eje X: Nivel de Vara (cm) | Eje Y: Volumen Neto (Litros)
                    </Text>
                </Group>
            </Stack>
        </Paper>
    );
}