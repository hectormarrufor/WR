'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    Container, Grid, Paper, Image, Title, Text, Badge, Group, Button,
    Tabs, ThemeIcon, Stack, Divider, LoadingOverlay, Modal, SimpleGrid,
    Card, Accordion, Progress, ActionIcon, Tooltip, Table, Alert,
    Timeline
} from '@mantine/core';
import { AreaChart, BarChart } from '@mantine/charts';
import {
    IconTruck, IconSettings,
    IconCheck, IconAlertTriangle, IconInfoCircle, IconPlus,
    IconChartLine, IconClipboardCheck,
    IconShoppingCart, IconAlertOctagon,
    IconTool,
    IconGauge, IconX, IconEdit,
    IconFileText, IconRoute, IconCash 
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';

import ModalReportarFalla from './inspecciones/ModalReportarFalla';
import ModalActualizarLectura from './inspecciones/ModalActualizarLecturas';
import ModalInstallComponente from '../components/ModalInstallComponente';
import ModalDesinstalarComponente from '../components/ModalDesinstalarComponente';

export default function DetalleActivoPage({ params }) {

    const { userId } = useAuth();
    const { id } = use(params);
    const router = useRouter();

    const [activo, setActivo] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modales
    const [modalFallaOpened, setModalFallaOpened] = useState(false);
    const [modalInstallOpened, setModalInstallOpened] = useState(false);
    const [modalOrdenOpened, setModalOrdenOpened] = useState(false);
    const [modalLecturaOpened, setModalLecturaOpened] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedHallazgo, setSelectedHallazgo] = useState(null);
    const [modalUninstallOpened, setModalUninstallOpened] = useState(false);
    const [itemToUninstall, setItemToUninstall] = useState(null);

    const fetchData = async () => {
        try {
            const response = await fetch(`/api/gestionMantenimiento/activos/${id}`);
            const result = await response.json();
            
            if (result.success) {
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

    const instance = activo.vehiculoInstancia || activo.remolqueInstancia || activo.maquinaInstancia || {};
    const plantilla = instance?.plantilla || {};
    const subsistemas = activo.subsistemasInstancia || [];
    const hallazgosPendientes = activo.inspecciones?.flatMap(i => i.hallazgos || []).filter(h => h.estado !== 'Cerrado') || [];

    const dataKilometraje = (activo.registrosKilometraje || []).map(r => ({
        fecha: new Date(r.fecha_registro).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
        valor: parseFloat(r.valor)
    }));

    const dataEficiencia = (activo.cargasCombustible || []).map(c => ({
        fecha: new Date(c.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
        rendimiento: parseFloat(c.rendimientoCalculado || 0),
    }));

    const fNum = (val) => val ? parseFloat(val) : 0;

    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'Operativo': return 'teal';
            case 'Operativo con Advertencia': return 'yellow';
            case 'No Operativo': return 'red';
            default: return 'gray';
        }
    };

    const totalMatrizKm = activo.matrizCosto?.totalCostoKm || 0;
    const totalMatrizHr = activo.matrizCosto?.totalCostoHora || 0;
    const fletesHistoricos = activo.tipoActivo === 'Vehiculo' ? activo.fletesComoVehiculo : activo.fletesComoRemolque;

    return (
        <Container size="xl" py="xl">
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
                    <Button variant="subtle" color="gray" onClick={() => router.push("/superuser/flota/activos")}>Volver</Button>
                    
                    <Group gap="xs">
                        <Button
                            variant="default"
                            leftSection={<IconEdit size={18} />}
                            onClick={() => router.push(`/superuser/flota/activos/${activo.id}/editar`)}
                        >
                            Editar
                        </Button>

                        <Button
                            variant="light"
                            leftSection={<IconGauge size={18} />}
                            onClick={() => setModalLecturaOpened(true)}
                        >
                            Lectura
                        </Button>

                        <Button
                            color="red"
                            leftSection={<IconClipboardCheck size={18} />}
                            onClick={() => setModalFallaOpened(true)}
                        >
                            Reportar
                        </Button>
                    </Group>
                </Group>
            </Group>

            <Grid gutter="md">
                {/* --- LATERAL: RESUMEN Y DOCUMENTOS --- */}
                <Grid.Col span={{ base: 12, md: 3 }}>
                    <Stack>
                        <Card withBorder radius="md" p={0}>
                            <Image 
                                src={activo.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${activo.imagen}?v=${process.env.NEXT_PUBLIC_APP_VERSION}` : null} 
                                h={200} 
                                fallbackSrc="https://placehold.co/400x300?text=Sin+Foto" 
                            />
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

                        {/* 🔥 FICHA TÉCNICA RÁPIDA ACTUALIZADA 🔥 */}
                        <Paper withBorder radius="md" p="md" bg="gray.0">
                            <Text fw={700} size="xs" mb="sm" c="dimmed">FICHA TÉCNICA RÁPIDA</Text>
                            <Stack gap={8}>
                                {/* Datos Físicos */}
                                <InfoLine label="S/N Motor" value={instance.serialMotor} />
                                <InfoLine label="S/N Chasis" value={instance.serialChasis} />
                                <InfoLine label="Combustible" value={plantilla.tipoCombustible} />
                                <InfoLine label="Capacidad" value={activo.capacidadTonelajeMax ? `${activo.capacidadTonelajeMax} Ton` : 'N/D'} />
                                <InfoLine label="Tara" value={activo.tara ? `${activo.tara} Kg` : 'N/D'} />
                                
                                <Divider my="xs" variant="dashed" />
                                
                                {/* Datos de Capital / Depreciación */}
                                <InfoLine label="Valor Vehículo" value={activo.valorReposicion ? `$${activo.valorReposicion.toLocaleString()}` : 'N/D'} />
                                <InfoLine label="Valor Salvamento" value={activo.valorSalvamento ? `$${activo.valorSalvamento.toLocaleString()}` : 'N/D'} />
                                <InfoLine label="Vida Útil" value={activo.vidaUtilAnios ? `${activo.vidaUtilAnios} Años` : 'N/D'} />
                                <InfoLine label="Costo Posesión" value={activo.costoPosesionHora ? `$${activo.costoPosesionHora.toFixed(2)}/hr` : 'N/D'} />
                            </Stack>
                        </Paper>

                        <Paper withBorder p="md" radius="md">
                            <Group justify="space-between" mb="sm">
                                <Text fw={700} size="xs" c="dimmed">DOCUMENTACIÓN LEGAL</Text>
                                <IconFileText size={16} color="gray" />
                            </Group>
                            <Stack gap="xs">
                                {activo.documentos?.map(doc => {
                                    const vencido = new Date(doc.fechaVencimiento) < new Date();
                                    return (
                                        <Group key={doc.id} justify="space-between" wrap="nowrap">
                                            <Text size="xs" fw={500} truncate>{doc.tipo}</Text>
                                            <Badge size="xs" color={vencido ? 'red' : 'green'} variant={vencido ? "filled" : "light"}>
                                                {new Date(doc.fechaVencimiento).toLocaleDateString('es-VE')}
                                            </Badge>
                                        </Group>
                                    );
                                })}
                                {(!activo.documentos?.length) && <Text size="xs" c="dimmed">No hay documentos registrados.</Text>}
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
                                <Tabs.Tab value="operaciones" leftSection={<IconRoute size={16} />}>
                                    Operaciones (Rutas)
                                </Tabs.Tab>
                                <Tabs.Tab value="costos" leftSection={<IconCash size={16} />}>
                                    Matriz de Costos
                                </Tabs.Tab>
                                <Tabs.Tab value="componentes" leftSection={<IconSettings size={16} />}>
                                    Inventario
                                </Tabs.Tab>
                                <Tabs.Tab value="uso" leftSection={<IconChartLine size={16} />}>
                                    Uso y Eficiencia
                                </Tabs.Tab>
                            </Tabs.List>

                            {/* 1. TAB: ALERTAS */}
                            <Tabs.Panel value="alertas">
                                <Stack>
                                    {hallazgosPendientes.length === 0 ? (
                                        <Alert color="green" icon={<IconCheck />} title="Todo en orden">
                                            No hay hallazgos pendientes. El equipo está saludable.
                                        </Alert>
                                    ) : (
                                        <Table striped highlightOnHover withTableBorder>
                                            <Table.Thead bg="red.0">
                                                <Table.Tr>
                                                    <Table.Th>Gravedad</Table.Th>
                                                    <Table.Th>Descripción</Table.Th>
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
                                                            <Text size="sm">{h.inspeccion?.reportadoPor?.nombre || 'Chofer'}</Text>
                                                        </Table.Td>
                                                        <Table.Td>{new Date(h.createdAt).toLocaleDateString()}</Table.Td>
                                                        <Table.Td>
                                                            <Button size="xs" variant="light" color="blue" onClick={() => { setSelectedHallazgo(h); setModalOrdenOpened(true); }}>
                                                                Crear Orden
                                                            </Button>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    )}

                                    <Divider label="Historial Reciente de Inspecciones" labelPosition="center" my="md" />
                                    <Timeline active={0} bulletSize={24} lineWidth={2}>
                                        {activo.inspecciones?.slice(0, 3).map(ins => (
                                            <Timeline.Item key={ins.id} bullet={<IconClipboardCheck size={12} />} title={`Inspección ${ins.origen}`}>
                                                <Text c="dimmed" size="xs">{new Date(ins.fecha).toLocaleString()}</Text>
                                                <Text size="sm">{ins.observacionGeneral || 'Sin observaciones'}</Text>
                                            </Timeline.Item>
                                        ))}
                                    </Timeline>
                                </Stack>
                            </Tabs.Panel>

                            {/* 2. TAB: ODT */}
                            <Tabs.Panel value="mantenimiento">
                                <Grid>
                                    {activo.ordenesMantenimiento?.map(odt => (
                                        <Grid.Col span={{ base: 12, md: 6 }} key={odt.id}>
                                            <Card withBorder padding="md" radius="md">
                                                <Group justify="space-between" mb="xs">
                                                    <Text fw={700} size="lg">{odt.codigo}</Text>
                                                    <Badge color={odt.estado === 'Esperando Stock' ? 'orange' : 'blue'}>{odt.estado}</Badge>
                                                </Group>
                                                <Text size="sm" c="dimmed" mb="md">Tipo: {odt.tipo} • Prioridad: {odt.prioridad}</Text>
                                                <Stack gap="xs">
                                                    {odt.repuestos?.map(rep => (
                                                        <Paper key={rep.id} withBorder p="xs" bg="gray.0">
                                                            <Group justify="space-between">
                                                                <Text size="sm">{rep.consumible?.nombre}</Text>
                                                                <Badge size="xs" color={rep.estado === 'Sin Stock' ? 'red' : 'green'} variant="outline">
                                                                    {rep.estado}
                                                                </Badge>
                                                            </Group>
                                                        </Paper>
                                                    ))}
                                                </Stack>
                                            </Card>
                                        </Grid.Col>
                                    ))}
                                    {(!activo.ordenesMantenimiento?.length) && (
                                        <Grid.Col span={12}><Text c="dimmed" ta="center" py="xl">No hay órdenes de mantenimiento activas.</Text></Grid.Col>
                                    )}
                                </Grid>
                            </Tabs.Panel>

                            {/* 3. TAB: OPERACIONES (RUTAS/FLETES) */}
                            <Tabs.Panel value="operaciones">
                                <Title order={5} mb="md">Historial de Rutas y Viajes</Title>
                                {fletesHistoricos?.length > 0 ? (
                                    <Table striped highlightOnHover withTableBorder>
                                        <Table.Thead bg="gray.1">
                                            <Table.Tr>
                                                <Table.Th>Nro Flete</Table.Th>
                                                <Table.Th>Fecha de Carga</Table.Th>
                                                <Table.Th>Ruta</Table.Th>
                                                <Table.Th>Estado</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {fletesHistoricos.map(f => (
                                                <Table.Tr key={f.id}>
                                                    <Table.Td fw={600}>#{f.nroFlete || f.id}</Table.Td>
                                                    <Table.Td>{new Date(f.fechaCarga).toLocaleDateString() || 'N/D'}</Table.Td>
                                                    <Table.Td>{f.origen || 'N/D'} ➝ {f.destino || 'N/D'}</Table.Td>
                                                    <Table.Td><Badge size="xs">{f.estado}</Badge></Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                ) : (
                                    <Alert color="gray" icon={<IconInfoCircle />}>
                                        Este activo no tiene fletes o rutas registradas en el sistema.
                                    </Alert>
                                )}
                            </Tabs.Panel>

                            {/* 4. TAB: MATRIZ DE COSTOS */}
                            <Tabs.Panel value="costos">
                                <Alert color="violet" icon={<IconCash />} mb="md" title="Estructura Financiera del Equipo">
                                    Los costos presentados derivan de la <b>Matriz: {activo.matrizCosto?.nombre || 'Genérica no asignada'}</b>.
                                </Alert>
                                
                                <SimpleGrid cols={{ base: 1, md: 3 }} mb="xl">
                                    <Card withBorder radius="md">
                                        <Text size="xs" c="dimmed" fw={700}>COSTO VARIABLE (POR KM)</Text>
                                        <Title order={3} c="blue.7">${totalMatrizKm.toFixed(2)}</Title>
                                        <Text size="xs" c="dimmed">Repuestos, Neumáticos, Lubricantes</Text>
                                    </Card>
                                    <Card withBorder radius="md">
                                        <Text size="xs" c="dimmed" fw={700}>COSTO FIJO (POR HORA)</Text>
                                        <Title order={3} c="orange.7">${totalMatrizHr.toFixed(2)}</Title>
                                        <Text size="xs" c="dimmed">Seguros, Rastreo, Nómina Fija</Text>
                                    </Card>
                                    <Card withBorder radius="md" bg="teal.0">
                                        <Text size="xs" c="dimmed" fw={700}>COSTO DE POSESIÓN (POR HORA)</Text>
                                        <Title order={3} c="teal.9">${activo.costoPosesionHora?.toFixed(2) || '0.00'}</Title>
                                        <Text size="xs" c="dimmed">Depreciación e Interés del Capital</Text>
                                    </Card>
                                </SimpleGrid>

                                <Title order={6} mb="sm" c="dimmed">DESGLOSE DE MANTENIMIENTO TEÓRICO</Title>
                                <Table withTableBorder striped highlightOnHover>
                                    <Table.Thead bg="gray.1">
                                        <Table.Tr>
                                            <Table.Th>Concepto</Table.Th>
                                            <Table.Th>Frecuencia de Desgaste</Table.Th>
                                            <Table.Th ta="right">Costo Estimado ($)</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {activo.matrizCosto?.detalles?.map(det => (
                                            <Table.Tr key={det.id}>
                                                <Table.Td fw={500}>{det.descripcion}</Table.Td>
                                                <Table.Td>{det.frecuencia} {det.tipoDesgaste}</Table.Td>
                                                <Table.Td ta="right">${det.costoUnitario?.toFixed(2)}</Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {(!activo.matrizCosto?.detalles?.length) && (
                                            <Table.Tr>
                                                <Table.Td colSpan={3} ta="center" c="dimmed" py="xl">
                                                    No hay detalles de costos vinculados a este activo.
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Tabs.Panel>

                            {/* 5. TAB: COMPONENTES E INVENTARIO */}
                            <Tabs.Panel value="componentes">
                                <Stack gap="md">
                                    {subsistemas.map((sub) => {
                                        const recomendaciones = sub.subsistemaPlantilla?.listaRecomendada || [];
                                        const instalaciones = sub.instalaciones || [];

                                        return (
                                            <Accordion variant="separated" key={sub.id} defaultValue="open">
                                                <Accordion.Item value="open">
                                                    <Accordion.Control>
                                                        <Group justify="space-between" pr="md">
                                                            <Text fw={600} size="sm">{sub.nombre}</Text>
                                                            <Badge size="sm" variant="light" color="blue">{recomendaciones.length} Items</Badge>
                                                        </Group>
                                                    </Accordion.Control>
                                                    <Accordion.Panel>
                                                        <Table verticalSpacing="sm" withTableBorder>
                                                            <Table.Thead bg="gray.1">
                                                                <Table.Tr>
                                                                    <Table.Th>Componente</Table.Th>
                                                                    <Table.Th>Estado</Table.Th>
                                                                    <Table.Th ta="right">Acción</Table.Th>
                                                                </Table.Tr>
                                                            </Table.Thead>
                                                            <Table.Tbody>
                                                                {recomendaciones.map((rec) => {
                                                                    const matches = instalaciones.filter(inst => inst.recomendacionId === rec.id);
                                                                    const cantidadInstalada = matches.reduce((sum, inst) => sum + parseFloat(inst.cantidad || 0), 0);
                                                                    const recCantidad = parseFloat(rec.cantidad || 1);
                                                                    const estaCompleto = cantidadInstalada >= recCantidad;

                                                                    return (
                                                                        <Table.Tr key={rec.id}>
                                                                            <Table.Td>
                                                                                <Text size="sm" fw={600}>{rec.label || rec.categoria}</Text>
                                                                                <Group gap="xs" mt={4}>
                                                                                    {matches.map(inst => (
                                                                                        <Badge 
                                                                                            key={inst.id} 
                                                                                            size="sm" 
                                                                                            color="gray" 
                                                                                            variant="dot"
                                                                                            rightSection={
                                                                                                <ActionIcon size="xs" color="red" variant="transparent" onClick={() => { setItemToUninstall(inst); setModalUninstallOpened(true); }}>
                                                                                                    <IconX size={10} />
                                                                                                </ActionIcon>
                                                                                            }
                                                                                        >
                                                                                            {inst.fichaTecnica.nombre}
                                                                                        </Badge>
                                                                                    ))}
                                                                                </Group>
                                                                            </Table.Td>
                                                                            <Table.Td>
                                                                                 <Badge color={estaCompleto ? 'green' : 'orange'} variant="light">
                                                                                    {cantidadInstalada}/{recCantidad}
                                                                                </Badge>
                                                                            </Table.Td>
                                                                            <Table.Td ta="right">
                                                                                <ActionIcon variant="subtle" color="blue" onClick={() => {
                                                                                    setSelectedItem({ sub: sub, rec: {...rec, cantidad: recCantidad, label: rec.label || rec.categoria} });
                                                                                    setModalInstallOpened(true);
                                                                                }}>
                                                                                    <IconPlus size={16} />
                                                                                </ActionIcon>
                                                                            </Table.Td>
                                                                        </Table.Tr>
                                                                    );
                                                                })}
                                                            </Table.Tbody>
                                                        </Table>
                                                    </Accordion.Panel>
                                                </Accordion.Item>
                                            </Accordion>
                                        );
                                    })}
                                </Stack>
                            </Tabs.Panel>

                            {/* 6. TAB: USO Y EFICIENCIA */}
                            <Tabs.Panel value="uso">
                                <SimpleGrid cols={{ base: 1, md: 2 }}>
                                    <Paper withBorder p="md">
                                        <Title order={5} mb="md">Kilometraje a través del tiempo</Title>
                                        <AreaChart h={250} data={dataKilometraje} dataKey="fecha" series={[{ name: 'valor', color: 'blue.6' }]} curveType="monotone" />
                                    </Paper>
                                    <Paper withBorder p="md">
                                        <Title order={5} mb="md">Rendimiento (Km por Litro)</Title>
                                        <BarChart h={250} data={dataEficiencia} dataKey="fecha" series={[{ name: 'rendimiento', color: 'teal.6' }]} />
                                    </Paper>
                                </SimpleGrid>
                            </Tabs.Panel>
                        </Tabs>
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* MODALES INTACTOS */}
            <Modal opened={modalOrdenOpened} onClose={() => setModalOrdenOpened(false)} title="Generar ODT" centered>
                 {selectedHallazgo && (
                    <Stack>
                        <Alert color="blue" icon={<IconInfoCircle />}>Atendiendo: <b>{selectedHallazgo.descripcion}</b></Alert>
                        <Button onClick={() => { notifications.show({ title: 'Orden Creada', color: 'green' }); setModalOrdenOpened(false); }}>Confirmar</Button>
                    </Stack>
                 )}
            </Modal>
            
            <ModalReportarFalla opened={modalFallaOpened} onClose={() => setModalFallaOpened(false)} activo={activo} userId={userId} onSuccess={fetchData} />
            <ModalActualizarLectura opened={modalLecturaOpened} onClose={() => setModalLecturaOpened(false)} activo={activo} userId={userId} onSuccess={fetchData} />
            <ModalInstallComponente opened={modalInstallOpened} onClose={() => { setModalInstallOpened(false); setSelectedItem(null); }} target={selectedItem} activoId={activo.id} onSuccess={fetchData} />
            <ModalDesinstalarComponente opened={modalUninstallOpened} onClose={() => setModalUninstallOpened(false)} item={itemToUninstall} onSuccess={fetchData} />
        </Container>
    );
}

const InfoLine = ({ label, value }) => (
    <Group justify="space-between"><Text size="xs" c="dimmed" fw={500}>{label}:</Text><Text size="xs" fw={700}>{value || '---'}</Text></Group>
);