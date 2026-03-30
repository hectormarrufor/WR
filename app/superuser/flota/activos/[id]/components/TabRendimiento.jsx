'use client';

import { useState } from 'react';
import { 
    Paper, Title, Group, Stack, Text, Button, SimpleGrid, Card, 
    ThemeIcon, Badge, Divider, Center
} from '@mantine/core';
import { AreaChart } from '@mantine/charts';
import { IconDashboard, IconGasStation, IconGeometry, IconTruck, IconAlertCircle, IconChartAreaLine, IconEngine, IconRulerMeasure } from '@tabler/icons-react';
import ModalConfigurarTanque from './ModalConfigurarTanque';

export default function TabRendimiento({ activo, onActualizado }) {
    const [modalConfigOpened, setModalConfigOpened] = useState(false);

    // 1. IDENTIFICADOR DEL TIPO DE EQUIPO
    const esLHr = !!(activo?.maquinaId || activo?.remolqueId);
    const unidadEtiqueta = esLHr ? 'L/Hr' : 'Km/L';
    const iconoEquipo = esLHr ? <IconEngine size={20} /> : <IconTruck size={20} />;

    // 2. EVALUACIÓN DE GEOMETRÍA
    const configPropia = activo?.configuracionTanque;
    const configPlantilla = activo?.vehiculoInstancia?.plantilla?.configuracionTanque 
                         || activo?.maquinaInstancia?.plantilla?.configuracionTanque 
                         || activo?.remolqueInstancia?.plantilla?.configuracionTanque;
                         
    const configActiva = configPropia || configPlantilla;
    const tipoOrigen = configPropia ? 'Aftermarket (Específico)' : (configPlantilla ? 'Original (Plantilla)' : 'No Configurado');

    // 3. EXTRACCIÓN DE LÍMITES TEÓRICOS
    const getLimitesConsumo = (a, usaHoras) => {
        if (!a) return null;
        if (usaHoras) {
            const plantilla = a.maquinaInstancia?.plantilla || a.remolqueInstancia?.plantilla;
            if (!plantilla || !plantilla.consumoTeoricoTrabajo || !plantilla.consumoTeoricoRalenti) return null;
            return {
                peorEscenario: parseFloat(plantilla.consumoTeoricoTrabajo), 
                mejorEscenario: parseFloat(plantilla.consumoTeoricoRalenti) 
            };
        } else {
            const plantilla = a.vehiculoInstancia?.plantilla;
            if (!plantilla || !plantilla.consumoTeoricoLleno || !plantilla.consumoTeoricoVacio) return null;
            return {
                peorEscenario: parseFloat(plantilla.consumoTeoricoLleno), 
                mejorEscenario: parseFloat(plantilla.consumoTeoricoVacio) 
            };
        }
    };

    const limites = getLimitesConsumo(activo, esLHr);

    // 4. DATOS DE LA GRÁFICA
    const datosGrafica = (activo?.cargasCombustible || [])
        .filter(carga => carga.rendimientoCalculado != null)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
        .map(carga => ({
            fecha: new Date(carga.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
            rendimiento: parseFloat(carga.rendimientoCalculado)
        }));

    return (
        <Stack gap="lg">
            {/* PANEL 1: GEOMETRÍA DEL TANQUE */}
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                    <Group>
                        <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                            <IconGeometry size={20} />
                        </ThemeIcon>
                        <Title order={3} c="dark.8">Geometría del Tanque</Title>
                    </Group>
                    <Button 
                        variant="light" 
                        color="blue" 
                        leftSection={<IconGasStation size={16} />}
                        onClick={() => setModalConfigOpened(true)}
                    >
                        Configurar Aforo
                    </Button>
                </Group>

                {configActiva ? (
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                        <Card withBorder padding="sm" radius="md">
                            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Forma del Tanque</Text>
                            <Text fw={700} size="lg" tt="capitalize">{configActiva.tipoForma}</Text>
                            <Badge color={configPropia ? 'orange' : 'blue'} variant="light" mt="xs">
                                Origen: {tipoOrigen}
                            </Badge>
                        </Card>
                        <Card withBorder padding="sm" radius="md">
                            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Dimensiones (cm)</Text>
                            {configActiva.tipoForma === 'cilindrico' ? (
                                <Text fw={600} size="md">L: {configActiva.dimensiones?.largo} x D: {configActiva.dimensiones?.diametro}</Text>
                            ) : (
                                <Text fw={600} size="md">L: {configActiva.dimensiones?.largo} x W: {configActiva.dimensiones?.ancho} x H: {configActiva.dimensiones?.alto}</Text>
                            )}
                            <Text size="xs" c="dimmed" mt="xs">
                                Factor Descuento: {(configActiva.factorDescuento * 100).toFixed(1)}%
                            </Text>
                        </Card>
                        <Card withBorder padding="sm" radius="md" bg="blue.0" style={{ borderColor: '#a5d8ff' }}>
                            <Text c="blue.8" size="xs" tt="uppercase" fw={700}>Capacidad Dinámica</Text>
                            <Text fw={900} size="xl" c="blue.9">
                                {activo.capacidadTanque ? `${activo.capacidadTanque} L` : 'Requiere Recálculo'}
                            </Text>
                        </Card>
                    </SimpleGrid>
                ) : (
                    <Paper p="md" bg="gray.0" radius="md" style={{ border: '1px dashed #ced4da' }}>
                        <Group justify="center" c="dimmed">
                            <IconAlertCircle size={20} />
                            <Text size="sm" fw={500}>La geometría del tanque no ha sido configurada. El aforo por vara no funcionará correctamente.</Text>
                        </Group>
                    </Paper>
                )}
            </Paper>

            {/* PANEL 2: GRÁFICA DE RENDIMIENTO HISTÓRICO */}
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Group mb="xl" justify="space-between">
                    <Group>
                        <ThemeIcon size="lg" radius="md" variant="light" color="teal">
                            <IconChartAreaLine size={20} />
                        </ThemeIcon>
                        <div>
                            <Title order={3} c="dark.8">Curva de Rendimiento</Title>
                            <Text size="sm" c="dimmed">Histórico de {unidadEtiqueta} de gasoil</Text>
                        </div>
                    </Group>
                </Group>

                {datosGrafica.length > 1 ? (
                    <AreaChart
                        h={300}
                        data={datosGrafica}
                        dataKey="fecha"
                        series={[
                            { name: 'rendimiento', color: 'teal.6', label: `Rendimiento (${unidadEtiqueta})` }
                        ]}
                        curveType="monotone"
                        tickLine="xy"
                        gridAxis="xy"
                        withGradient
                        tooltipAnimationDuration={200}
                    />
                ) : (
                    <Paper p="xl" radius="md" bg="gray.0" style={{ border: '1px dashed #ced4da' }}>
                        <Center>
                            <Stack align="center" gap="xs">
                                <Group gap="xs">
                                    <IconGasStation size={32} color="#adb5bd" />
                                    <IconRulerMeasure size={32} color="#adb5bd" />
                                </Group>
                                <Text fw={500} c="dimmed">Datos Insuficientes</Text>
                                <Text size="sm" c="dimmed" ta="center">
                                    Se necesitan al menos dos despachos cerrados <br/> 
                                    <b>(Tanque Full o aforados con Vara)</b> <br/> 
                                    para proyectar la curva de rendimiento.
                                </Text>
                            </Stack>
                        </Center>
                    </Paper>
                )}
            </Paper>

            {/* PANEL 3: PARÁMETROS TEÓRICOS DINÁMICOS */}
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Group mb="md">
                    <ThemeIcon size="lg" radius="md" variant="light" color="orange">
                        <IconDashboard size={20} />
                    </ThemeIcon>
                    <Title order={3} c="dark.8">Parámetros de Rendimiento Teórico</Title>
                </Group>
                
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Card withBorder padding="md" radius="md">
                        <Group wrap="nowrap">
                            <ThemeIcon size={40} radius="xl" color="gray" variant="light">
                                {iconoEquipo}
                            </ThemeIcon>
                            <div>
                                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                                    {esLHr ? 'Rendimiento en Ralentí' : 'Rendimiento Vacío (Ideal)'}
                                </Text>
                                <Text fw={900} size="xl" c="dark.8">
                                    {limites ? `${limites.mejorEscenario} ${unidadEtiqueta}` : 'N/D'}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    {esLHr ? 'Mejor escenario: motor encendido sin carga' : 'Mejor escenario: sin peso en batea'}
                                </Text>
                            </div>
                        </Group>
                    </Card>

                    <Card withBorder padding="md" radius="md">
                        <Group wrap="nowrap">
                            <ThemeIcon size={40} radius="xl" color="orange" variant="light">
                                {iconoEquipo}
                            </ThemeIcon>
                            <div>
                                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                                    {esLHr ? 'Rendimiento en Trabajo' : 'Rendimiento Cargado'}
                                </Text>
                                <Text fw={900} size="xl" c="dark.8">
                                    {limites ? `${limites.peorEscenario} ${unidadEtiqueta}` : 'N/D'}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    {esLHr ? 'Peor escenario: trabajo pesado constante' : 'Peor escenario: con peso máximo'}
                                </Text>
                            </div>
                        </Group>
                    </Card>
                </SimpleGrid>
                
                <Divider my="md" />
                <Text size="xs" c="dimmed" ta="center">
                    Estos parámetros se definen en el Catálogo de Modelos (Plantillas) y aplican para toda la flota de este tipo.
                </Text>
            </Paper>

            <ModalConfigurarTanque 
                opened={modalConfigOpened} 
                onClose={() => setModalConfigOpened(false)} 
                activo={activo}
                onSuccess={onActualizado} 
            />
        </Stack>
    );
}