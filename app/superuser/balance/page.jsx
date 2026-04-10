'use client';

import { useState, useEffect } from 'react';
import { 
    Container, Title, Text, Group, LoadingOverlay, Tabs, Badge, ActionIcon, Tooltip 
} from '@mantine/core';
import { 
    IconChartBar, IconArrowDownRight, IconArrowUpRight, IconRefresh, IconServerBolt 
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

// Importamos los submódulos
import TabResumen from './components/TabResumen';
import TabIngresos from './components/TabIngresos';
import TabEgresos from './components/TabEgresos';

export default function BalanceDashboard() {
    const [loading, setLoading] = useState(true);
    
    const [data, setData] = useState({
        grafico: [],
        kpis: { totalIngresos: 0, totalGastos: 0, utilidadNeta: 0, rentabilidad: 0 }
    });
    const [listaIngresos, setListaIngresos] = useState([]);
    const [listaEgresos, setListaEgresos] = useState([]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const resBalance = await fetch('/api/balance');
            if (!resBalance.ok) throw new Error(`API Balance falló: ${resBalance.statusText}`);
            const jsonBalance = await resBalance.json();
            
            if (jsonBalance.success) {
                setData(jsonBalance.data);
            } else {
                throw new Error(jsonBalance.error);
            }

            const resIngresos = await fetch('/api/ingresos');
            if (!resIngresos.ok) throw new Error(`API Ingresos falló: ${resIngresos.statusText}`);
            const jsonIngresos = await resIngresos.json();
            if (Array.isArray(jsonIngresos)) setListaIngresos(jsonIngresos);

            const resGastos = await fetch('/api/gastos-variables');
            if (!resGastos.ok) throw new Error(`API Gastos falló: ${resGastos.statusText}`);
            const jsonGastos = await resGastos.json();
            if (Array.isArray(jsonGastos)) setListaEgresos(jsonGastos);

        } catch (error) {
            console.error("Error detallado en el Dashboard:", error);
            notifications.show({ 
                title: 'Fallo de Sincronización', 
                message: error.message || 'No se pudo conectar con el servidor central', 
                color: 'red',
                autoClose: 6000
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
    };

    const getEstadoBadge = (estado) => {
        switch (estado) {
            case 'Cobrado':
            case 'Pagado':
                return <Badge color="teal" variant="light" size="sm">{estado}</Badge>;
            case 'Pendiente':
                return <Badge color="yellow" variant="light" size="sm">{estado}</Badge>;
            case 'Anulado':
                return <Badge color="red" variant="light" size="sm">{estado}</Badge>;
            default:
                return <Badge color="gray" variant="light" size="sm">{estado}</Badge>;
        }
    };

    return (
        <Container fluid p="md" pos="relative">
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ blur: 2 }} />
            
            {/* CABECERA ESTILO TERMINAL */}
            <Group justify="space-between" mb="xl" align="flex-end">
                <div>
                    <Group gap="xs" mb={4}>
                        <IconServerBolt size={16} color="var(--mantine-color-green-6)" />
                        <Text size="xs" fw={800} c="green.6" tt="uppercase" ls={2}>Conexión Segura • Datos en Tiempo Real</Text>
                    </Group>
                    <Title 
                        order={1} 
                        fw={900} 
                        variant="gradient" 
                        gradient={{ from: 'gray.9', to: 'gray.6', deg: 90 }}
                        style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}
                    >
                        Terminal Financiero
                    </Title>
                    <Text c="dimmed" fw={500}>Consolidado de Flujo de Caja Maestro (Ingresos vs Egresos Reales)</Text>
                </div>
                <Group>
                    <Tooltip label="Forzar Sincronización">
                        <ActionIcon variant="light" color="blue" size="lg" radius="md" onClick={fetchAllData}>
                            <IconRefresh size={22} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            <Tabs defaultValue="resumen" variant="pills" radius="md">
                <Tabs.List mb="md">
                    <Tabs.Tab value="resumen" leftSection={<IconChartBar size={16} />}>Panel de Rendimiento</Tabs.Tab>
                    <Tabs.Tab value="ingresos" leftSection={<IconArrowDownRight size={16} />} color="teal">Libro de Ingresos</Tabs.Tab>
                    <Tabs.Tab value="egresos" leftSection={<IconArrowUpRight size={16} />} color="red">Libro Diario Egresos</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="resumen">
                    <TabResumen 
                        data={data} 
                        formatCurrency={formatCurrency} 
                    />
                </Tabs.Panel>

                <Tabs.Panel value="ingresos">
                    <TabIngresos 
                        listaIngresos={listaIngresos} 
                        formatCurrency={formatCurrency} 
                        getEstadoBadge={getEstadoBadge} 
                    />
                </Tabs.Panel>

                <Tabs.Panel value="egresos">
                    <TabEgresos 
                        listaEgresos={listaEgresos} 
                        formatCurrency={formatCurrency} 
                        getEstadoBadge={getEstadoBadge} 
                        onRefresh={fetchAllData}
                    />
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
}