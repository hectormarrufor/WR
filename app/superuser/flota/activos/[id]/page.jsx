'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Container, Grid, Paper, Image, Title, Text, Badge, Group, Button, 
    Tabs, ThemeIcon, Stack, Divider, LoadingOverlay, Modal, SimpleGrid,
    Box, Card, Accordion, Progress, ActionIcon, Tooltip, Table, Alert,
    Timeline, RingProgress
} from '@mantine/core';
import { AreaChart, BarChart } from '@mantine/charts';
import { 
    IconTruck, IconSettings, 
    IconCheck, IconAlertTriangle, IconInfoCircle, IconPlus, 
    IconChartLine, IconClipboardCheck, 
     IconShoppingCart, IconAlertOctagon,
     IconTool,
    
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';

export default function DetalleActivoPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const { isAdmin } = useAuth();

    const [activo, setActivo] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Modales
    const [modalInstallOpened, setModalInstallOpened] = useState(false);
    const [modalOrdenOpened, setModalOrdenOpened] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null); // Para instalar consumible
    const [selectedHallazgo, setSelectedHallazgo] = useState(null); // Para crear ODT

    const fetchData = async () => {
        try {
            const response = await fetch(`/api/gestionMantenimiento/activos/${id}`);
            const result = await response.json();
            
            if (result.success) {
                // Parche para asegurar que tenemos el último KM aunque la tabla maestra no se haya actualizado
                const dataMejorada = {
                    ...result.data,
                    kilometrajeActual: result.data.registrosKilometraje?.length 
                        ? result.data.registrosKilometraje[result.data.registrosKilometraje.length - 1].valor 
                        : (result.data.vehiculoInstancia?.kilometrajeActual || 0)
                };
                setActivo(dataMejorada);
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Error cargando datos del activo', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [id]);

    if (loading || !activo) return <LoadingOverlay visible={true} zIndex={1000} />;

    // --- DESTRUCTURING SEGURO ---
    const instance = activo.vehiculoInstancia || activo.remolqueInstancia || activo.maquinaInstancia || {};
    const plantilla = instance?.plantilla || {};
    const subsistemas = activo.subsistemasInstancia || [];
    const hallazgosPendientes = activo.inspecciones?.flatMap(i => i.hallazgos || []).filter(h => h.estado !== 'Cerrado') || [];
    
    // --- DATOS PARA GRÁFICOS ---
    const dataKilometraje = (activo.registrosKilometraje || []).map(r => ({
        fecha: new Date(r.fecha_registro).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
        valor: parseFloat(r.valor)
    }));

    const dataEficiencia = (activo.cargasCombustible || []).map(c => ({
        fecha: new Date(c.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
        rendimiento: parseFloat(c.rendimientoCalculado || 0),
    }));

    const fNum = (val) => val ? parseFloat(val) : 0;

    // Helpers de UI
    const getEstadoColor = (estado) => {
        switch(estado) {
            case 'Operativo': return 'teal';
            case 'Operativo con Advertencia': return 'yellow';
            case 'No Operativo': return 'red';
            default: return 'gray';
        }
    };

    return (
        <Container size="xl" py="xl">
            {/* --- HEADER CRÍTICO --- */}
            {activo.estado === 'No Operativo' && (
                <Alert variant="filled" color="red" title="EQUIPO INOPERATIVO" icon={<IconAlertOctagon />} mb="lg">
                    Este activo se encuentra detenido por hallazgos críticos. Revise la pestaña de "Salud y Alertas".
                </Alert>
            )}

            <Group justify="space-between" mb="xl">
                <Stack gap={0}>
                    <Group gap="xs">
                        <IconTruck size={28} color="#228be6" />
                        <Title order={2}>{activo.codigoInterno}</Title>
                        <Badge size="lg" color={getEstadoColor(activo.estado)} variant="filled">
                            {activo.estado}
                        </Badge>
                    </Group>
                    <Text c="dimmed" size="sm" fw={500}>
                        {plantilla.marca} {plantilla.modelo} • {instance.placa || 'N/A'} • {activo.ubicacionActual}
                    </Text>
                </Stack>
                <Group>
                    <Button variant="default" onClick={() => router.back()}>Volver</Button>
                    <Button color="red" leftSection={<IconClipboardCheck size={18}/>} onClick={() => notifications.show({ message: 'Ir a formulario de inspección (Chofer)'})}>
                        Reportar Falla
                    </Button>
                </Group>
            </Group>

            <Grid gutter="md">
                {/* --- LATERAL: RESUMEN --- */}
                <Grid.Col span={{ base: 12, md: 3 }}>
                    <Stack>
                        <Card withBorder radius="md" p={0}>
                            <Image src={activo.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${activo.imagen}` : null} h={200} fallbackSrc="https://placehold.co/400x300?text=Sin+Foto" />
                            <Stack p="md" gap="xs">
                                <Text size="xs" fw={700} c="dimmed">ESTADÍSTICAS VITALES</Text>
                                <Group justify="space-between">
                                    <Text size="sm">Odómetro:</Text>
                                    <Text fw={700}>{fNum(activo.kilometrajeActual).toLocaleString()} km</Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="sm">Hallazgos:</Text>
                                    <Badge color={hallazgosPendientes.length > 0 ? 'red' : 'green'} variant="light">
                                        {hallazgosPendientes.length} Pendientes
                                    </Badge>
                                </Group>
                            </Stack>
                        </Card>

                        <Paper withBorder radius="md" p="md" bg="gray.0">
                            <Text fw={700} size="xs" mb="sm" c="dimmed">FICHA TÉCNICA RÁPIDA</Text>
                            <Stack gap={8}>
                                <InfoLine label="S/N Motor" value={instance.serialMotor} />
                                <InfoLine label="S/N Chasis" value={instance.serialChasis} />
                                <InfoLine label="Combustible" value={plantilla.tipoCombustible} />
                            </Stack>
                        </Paper>
                    </Stack>
                </Grid.Col>

                {/* --- PRINCIPAL: TABS --- */}
                <Grid.Col span={{ base: 12, md: 9 }}>
                    <Paper withBorder radius="md" p="md">
                        <Tabs defaultValue="alertas" keepMounted={false}>
                            <Tabs.List mb="lg">
                                <Tabs.Tab value="alertas" leftSection={<IconAlertTriangle size={16} color={hallazgosPendientes.length ? "red" : "gray"} />}>
                                    Salud y Alertas
                                </Tabs.Tab>
                                <Tabs.Tab value="mantenimiento" leftSection={<IconTool size={16} />}>
                                    Taller (ODT)
                                </Tabs.Tab>
                                <Tabs.Tab value="componentes" leftSection={<IconSettings size={16} />}>
                                    Inventario Instalado
                                </Tabs.Tab>
                                <Tabs.Tab value="uso" leftSection={<IconChartLine size={16} />}>
                                    Uso y Eficiencia
                                </Tabs.Tab>
                            </Tabs.List>

                            {/* 1. TAB: ALERTAS Y HALLAZGOS (MATA ESTADOS) */}
                            <Tabs.Panel value="alertas">
                                <Stack>
                                    {hallazgosPendientes.length === 0 ? (
                                        <Alert color="green" icon={<IconCheck />} title="Todo en orden">
                                            No hay hallazgos pendientes de revisión. El equipo está saludable.
                                        </Alert>
                                    ) : (
                                        <Table striped highlightOnHover withTableBorder>
                                            <Table.Thead bg="red.0">
                                                <Table.Tr>
                                                    <Table.Th>Gravedad</Table.Th>
                                                    <Table.Th>Descripción del Hallazgo</Table.Th>
                                                    <Table.Th>Reportado Por</Table.Th>
                                                    <Table.Th>Fecha</Table.Th>
                                                    <Table.Th>Acción</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {hallazgosPendientes.map(h => (
                                                    <Table.Tr key={h.id}>
                                                        <Table.Td>
                                                            <Badge color={h.impacto === 'No Operativo' ? 'red' : 'yellow'}>{h.impacto}</Badge>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm" fw={500}>{h.descripcion}</Text>
                                                            <Text size="xs" c="dimmed">Subsistema: {h.subsistema?.nombre || 'General'}</Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Group gap="xs">
                                                                <ThemeIcon size="xs" radius="xl"><IconClipboardCheck size={10}/></ThemeIcon>
                                                                <Text size="sm">{h.inspeccion?.reportadoPor?.nombre || 'Chofer'}</Text>
                                                            </Group>
                                                        </Table.Td>
                                                        <Table.Td>{new Date(h.createdAt).toLocaleDateString()}</Table.Td>
                                                        <Table.Td>
                                                            <Button 
                                                                size="xs" 
                                                                variant="light" 
                                                                color="blue"
                                                                onClick={() => { setSelectedHallazgo(h); setModalOrdenOpened(true); }}
                                                            >
                                                                Crear Orden
                                                            </Button>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    )}

                                    <Divider label="Historial Reciente de Inspecciones" labelPosition="center" my="md"/>
                                    
                                    <Timeline active={0} bulletSize={24} lineWidth={2}>
                                        {activo.inspecciones?.slice(0, 3).map(ins => (
                                            <Timeline.Item 
                                                key={ins.id} 
                                                bullet={<IconClipboardCheck size={12} />} 
                                                title={`Inspección ${ins.origen}`}
                                            >
                                                <Text c="dimmed" size="xs">Por: {ins.reportadoPor?.nombre} • {new Date(ins.fecha).toLocaleString()}</Text>
                                                <Text size="sm" mt={4}>{ins.observacionGeneral || 'Sin observaciones generales'}</Text>
                                            </Timeline.Item>
                                        ))}
                                    </Timeline>
                                </Stack>
                            </Tabs.Panel>

                            {/* 2. TAB: TALLER Y ODTs (FLUJO DE REQUISICIÓN) */}
                            <Tabs.Panel value="mantenimiento">
                                <Grid>
                                    {activo.ordenesMantenimiento?.map(odt => (
                                        <Grid.Col span={{ base: 12, md: 6 }} key={odt.id}>
                                            <Card withBorder padding="md" radius="md">
                                                <Group justify="space-between" mb="xs">
                                                    <Text fw={700} size="lg">{odt.codigo}</Text>
                                                    <Badge color={odt.estado === 'Esperando Stock' ? 'orange' : 'blue'}>
                                                        {odt.estado}
                                                    </Badge>
                                                </Group>
                                                <Text size="sm" c="dimmed" mb="md">
                                                    Tipo: {odt.tipo} • Prioridad: {odt.prioridad}
                                                </Text>
                                                
                                                <Stack gap="xs">
                                                    {odt.repuestos?.map( rep => (
                                                        <Paper key={rep.id} withBorder p="xs" bg="gray.0">
                                                            <Group justify="space-between">
                                                                <Text size="sm">{rep.consumible?.nombre}</Text>
                                                                <Badge 
                                                                    size="xs" 
                                                                    color={rep.estado === 'Sin Stock' || rep.estado === 'En Requisicion' ? 'red' : 'green'}
                                                                    variant="outline"
                                                                >
                                                                    {rep.estado}
                                                                </Badge>
                                                            </Group>
                                                            {rep.estado === 'En Requisicion' && (
                                                                <Group gap={4} mt={4}>
                                                                    <IconShoppingCart size={12} color="orange"/>
                                                                    <Text size="xs" c="orange" fw={700}>
                                                                        Requisición Automática Generada
                                                                    </Text>
                                                                </Group>
                                                            )}
                                                        </Paper>
                                                    ))}
                                                </Stack>

                                                <Button fullWidth mt="md" variant="default">Ver Detalle ODT</Button>
                                            </Card>
                                        </Grid.Col>
                                    ))}
                                    {(!activo.ordenesMantenimiento || activo.ordenesMantenimiento.length === 0) && (
                                        <Grid.Col span={12}>
                                            <Text c="dimmed" ta="center" py="xl">No hay órdenes de mantenimiento activas.</Text>
                                        </Grid.Col>
                                    )}
                                </Grid>
                            </Tabs.Panel>

                            {/* 3. TAB: COMPONENTES (SUMATORIA FUNGIBLE + SERIALES) */}
                            <Tabs.Panel value="componentes">
                                <Accordion variant="separated">
                                    {subsistemas.map((sub) => (
                                        <Accordion.Item key={sub.id} value={sub.id.toString()}>
                                            <Accordion.Control>
                                                <Group justify="space-between" pr="md">
                                                    <Group>
                                                        <ThemeIcon variant="light" color="blue"><IconSettings size={18} /></ThemeIcon>
                                                        <Text fw={600} size="sm">{sub.nombre}</Text>
                                                    </Group>
                                                    <Badge size="sm" variant="light">{sub.subsistemaPlantilla?.categoria}</Badge>
                                                </Group>
                                            </Accordion.Control>
                                            <Accordion.Panel>
                                                <Table variant="simple" verticalSpacing="sm">
                                                    <Table.Thead bg="gray.0">
                                                        <Table.Tr>
                                                            <Table.Th>Componente</Table.Th>
                                                            <Table.Th>Instalado / Requerido</Table.Th>
                                                            <Table.Th ta="center">Estado</Table.Th>
                                                            <Table.Th ta="right">Acción</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        {sub.subsistemaPlantilla?.listaRecomendada?.map((rec) => {
                                                            const insts = sub.instalaciones?.filter(i => i.recomendacionId === rec.id) || [];
                                                            // LÓGICA DE SUMATORIA CORREGIDA
                                                            const totalInstalado = insts.reduce((sum, i) => sum + fNum(i.cantidad), 0);
                                                            const cantidadRequerida = fNum(rec.canti); // Usando nombres del JSON previo
                                                            const esCompleto = totalInstalado >= cantidadRequerida;

                                                            return (
                                                                <Table.Tr key={rec.id}>
                                                                    <Table.Td>
                                                                        <Text size="sm" fw={600}>{rec.categ}</Text>
                                                                        <Text size="xs" c="dimmed">{rec.tipoC === 'tecnico' ? rec.valor : 'Estándar'}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td>
                                                                        <Stack gap={2}>
                                                                            <Group gap="xs">
                                                                                <Text size="sm" fw={700} c={esCompleto ? 'black' : 'red'}>
                                                                                    {totalInstalado} / {cantidadRequerida} {rec.categ === 'aceite' ? 'L' : 'u'}
                                                                                </Text>
                                                                            </Group>
                                                                            <Progress 
                                                                                value={(totalInstalado / cantidadRequerida) * 100} 
                                                                                color={esCompleto ? 'green' : 'orange'} 
                                                                                size="sm" 
                                                                            />
                                                                            {insts.length > 0 && (
                                                                                <Text size="xs" c="dimmed">
                                                                                    {insts.some(i => i.serialActual) ? 'Seriales: ' + insts.map(i => i.serialActual).join(', ') : 'Fungible a granel'}
                                                                                </Text>
                                                                            )}
                                                                        </Stack>
                                                                    </Table.Td>
                                                                    <Table.Td ta="center">
                                                                        <Badge color={esCompleto ? 'green' : 'orange'} variant="light">
                                                                            {esCompleto ? 'OK' : 'Incompleto'}
                                                                        </Badge>
                                                                    </Table.Td>
                                                                    <Table.Td ta="right">
                                                                        <Tooltip label="Instalar pieza">
                                                                            <ActionIcon variant="light" onClick={() => { setSelectedItem({ sub, rec }); setModalInstallOpened(true); }}>
                                                                                <IconPlus size={16} />
                                                                            </ActionIcon>
                                                                        </Tooltip>
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            );
                                                        })}
                                                    </Table.Tbody>
                                                </Table>
                                            </Accordion.Panel>
                                        </Accordion.Item>
                                    ))}
                                </Accordion>
                            </Tabs.Panel>

                            {/* 4. TAB: USO Y EFICIENCIA (GRÁFICOS) */}
                            <Tabs.Panel value="uso">
                                <Stack gap="xl">
                                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                                        <Paper withBorder p="md" radius="md">
                                            <Title order={5} mb="md">Tendencia de Kilometraje</Title>
                                            <AreaChart
                                                h={200}
                                                data={dataKilometraje}
                                                dataKey="fecha"
                                                series={[{ name: 'valor', color: 'blue.6', label: 'Km' }]}
                                                curveType="monotone"
                                            />
                                        </Paper>
                                        <Paper withBorder p="md" radius="md">
                                            <Title order={5} mb="md">Rendimiento (km/l)</Title>
                                            <BarChart
                                                h={200}
                                                data={dataEficiencia}
                                                dataKey="fecha"
                                                series={[{ name: 'rendimiento', color: 'teal.6', label: 'Km/L' }]}
                                            />
                                        </Paper>
                                    </SimpleGrid>
                                </Stack>
                            </Tabs.Panel>
                        </Tabs>
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* MODAL 1: INSTALAR PIEZA DE INVENTARIO */}
            <Modal opened={modalInstallOpened} onClose={() => setModalInstallOpened(false)} title="Instalación de Componente" centered>
                {selectedItem && (
                    <Stack>
                        <Text>Vinculando <b>{selectedItem.rec.categ}</b> en subsistema <b>{selectedItem.sub.nombre}</b>.</Text>
                        <Button fullWidth onClick={() => {notifications.show({message: 'Aquí abriría el selector de stock'}); setModalInstallOpened(false);}}>
                            Seleccionar del Almacén
                        </Button>
                    </Stack>
                )}
            </Modal>

            {/* MODAL 2: CREAR ODT DESDE HALLAZGO */}
            <Modal opened={modalOrdenOpened} onClose={() => setModalOrdenOpened(false)} title="Generar Orden de Mantenimiento" centered size="lg">
                {selectedHallazgo && (
                    <Stack>
                        <Alert color="blue" icon={<IconInfoCircle/>}>
                            Se creará una orden para atender: <b>{selectedHallazgo.descripcion}</b>
                        </Alert>
                        <Text size="sm">Diagnóstico preliminar: El sistema verificará stock automáticamente al guardar.</Text>
                        
                        {/* Aquí iría el form de selección de repuestos */}
                        <Button fullWidth mt="md" onClick={() => {
                            notifications.show({ title: 'Orden Creada', message: 'Se ha verificado el stock y generado requisiciones necesarias.', color: 'green'});
                            setModalOrdenOpened(false);
                        }}>
                            Confirmar y Verificar Stock
                        </Button>
                    </Stack>
                )}
            </Modal>
        </Container>
    );
}

const InfoLine = ({ label, value }) => (
    <Group justify="space-between"><Text size="xs" c="dimmed">{label}:</Text><Text size="xs" fw={700}>{value || '---'}</Text></Group>
);