'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Container, Grid, Paper, Image, Title, Text, Badge, Group, Button,
    Tabs, ThemeIcon, Stack, Divider, LoadingOverlay, Modal, SimpleGrid,
    Card, Accordion, Progress, ActionIcon, Tooltip, Table, Alert,
    Timeline, Box, Center
} from '@mantine/core';
import { AreaChart, BarChart } from '@mantine/charts';
import {
    IconTruck, IconSettings,
    IconCheck, IconAlertTriangle, IconInfoCircle, IconPlus,
    IconChartLine, IconClipboardCheck,
    IconAlertOctagon, IconTool,
    IconGauge, IconX, IconEdit,
    IconFileText, IconRoute, IconCash,
    IconEngine, IconDashboard, IconShieldCheck, IconPhoto,
    IconDownload, IconPrinter, IconMaximize
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';

import ModalReportarFalla from './inspecciones/ModalReportarFalla';
import ModalActualizarLectura from './inspecciones/ModalActualizarLecturas';
import ModalInstallComponente from '../components/ModalInstallComponente';
import ModalDesinstalarComponente from '../components/ModalDesinstalarComponente';
import ModalAgregarDocumento from '../components/ModalAgregarDocumento';

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
    const [modalDocOpened, setModalDocOpened] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedHallazgo, setSelectedHallazgo] = useState(null);
    const [modalUninstallOpened, setModalUninstallOpened] = useState(false);
    const [itemToUninstall, setItemToUninstall] = useState(null);
    const [docPreview, setDocPreview] = useState(null); // Guardará la URL y datos del doc a ver

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

    const documentosFaltantes = useMemo(() => {
        if (!activo) return [];
        const docsActuales = activo.documentos || [];
        const faltantes = [];

        // Universal
        if (!docsActuales.some(d => d.tipo === 'Documento de Propiedad')) faltantes.push('Doc. Propiedad');

        if (activo.tipoActivo === 'Vehiculo' || activo.tipoActivo === 'Remolque') {
            if (!docsActuales.some(d => d.tipo === 'Poliza de Seguro')) faltantes.push('Seguro');
            if (!docsActuales.some(d => d.tipo === 'ROTC')) faltantes.push('ROTC');

            // 🔥 Si quieres obligarlos para toda la flota:
            if (!docsActuales.some(d => d.tipo === 'RACDA')) faltantes.push('RACDA');
            if (!docsActuales.some(d => d.tipo === 'RUNSAI')) faltantes.push('RUNSAI');
            if (!docsActuales.some(d => d.tipo === 'DAEX')) faltantes.push('DAEX');

            if (activo.tipoActivo === 'Vehiculo' && !docsActuales.some(d => d.tipo === 'Trimestres Municipales')) {
                faltantes.push('Trimestres');
            }
        }

        if (activo.tipoActivo === 'Inmueble') {
            if (!docsActuales.some(d => d.tipo === 'Cedula Catastral')) faltantes.push('Catastro');
            if (!docsActuales.some(d => d.tipo === 'Permiso de Bomberos')) faltantes.push('Bomberos');
        }

        return faltantes;
    }, [activo]);

    if (loading || !activo) return <LoadingOverlay visible={true} zIndex={1000} color="dark" loaderProps={{ color: 'yellow.6', type: 'bars' }} />;

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
            case 'Operativo': return 'teal.6';
            case 'Operativo con Advertencia': return 'yellow.6';
            case 'No Operativo': return 'red.7';
            default: return 'gray.6';
        }
    };

    const totalMatrizKm = activo.matrizCosto?.totalCostoKm || 0;
    const totalMatrizHr = activo.matrizCosto?.totalCostoHora || 0;
    const fletesHistoricos = activo.tipoActivo === 'Vehiculo' ? activo.fletesComoVehiculo : activo.fletesComoRemolque;

    const getCapacidadCarga = () => {
        if (activo.capacidadTonelajeMax) return `${activo.capacidadTonelajeMax} Tons`;
        if (plantilla.capacidadArrastre || plantilla.capacidadCarga) return `${plantilla.capacidadArrastre || plantilla.capacidadCarga} Tons (Fábrica)`;
        return 'N/D';
    };

    const getTara = () => {
        if (activo.tara) return `${activo.tara} Tons`;
        if (plantilla.peso) return `${plantilla.peso} Tons (Fábrica)`;
        return 'N/D';
    };

    // 🔥 FUNCIONES DE VISOR DE DOCUMENTOS 🔥
    const handleDownloadDoc = async (url, filename) => {
        try {
            // Hacemos fetch para forzar la descarga en lugar de abrir una pestaña nueva
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename || 'documento_expediente.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            // Fallback por si hay bloqueos de CORS
            window.open(url, '_blank');
        }
    };

    const handlePrintDoc = (url) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head><title>Imprimir Documento</title></head>
                <body style="margin:0; display:flex; justify-content:center; align-items:flex-start; padding-top:20px;">
                    <img src="${url}" style="max-width:100%; max-height:95vh; object-fit:contain;" onload="window.print(); window.close();" />
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Box w="100%" p={0} m={0} bg="#e9ecef" style={{ minHeight: '100vh', paddingBottom: '60px' }}>

            {/* 🔥 HEADER INDUSTRIAL 🔥 */}
            <Box bg="dark.9" px={{ base: 'md', xl: '3rem' }} py="xl" style={{ borderBottom: '6px solid #fab005', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                <Group justify="space-between" align="flex-start" wrap="wrap">
                    <Group gap="lg" align="center">
                        <ThemeIcon size={80} radius="md" color="dark.6" variant="filled" style={{ border: '2px solid #fab005' }}>
                            <IconTruck size={50} color="#fab005" />
                        </ThemeIcon>
                        <Stack gap={4}>
                            <Group gap="md" align="center">
                                <Title order={1} c="white" tt="uppercase" style={{ letterSpacing: '2px', fontSize: '2.5rem' }}>
                                    {activo.codigoInterno}
                                </Title>
                                <Badge size="xl" color={getEstadoColor(activo.estado)} variant="filled" radius="sm" style={{ padding: '16px 20px', fontSize: '1rem', fontWeight: 900 }}>
                                    {activo.estado}
                                </Badge>
                            </Group>
                            <Text c="gray.4" size="lg" fw={600} tt="uppercase" style={{ letterSpacing: '1px' }}>
                                {plantilla.marca} {plantilla.modelo} • AÑO {activo.anio} • PLACA: <Text span c="yellow.5" fw={900}>{instance.placa || 'N/A'}</Text>
                            </Text>
                            <Group gap="xs" mt={4}>
                                <IconRoute size={16} color="#adb5bd" />
                                <Text size="sm" c="gray.5" fw={700}>Base Actual: {activo.ubicacionActual}</Text>
                            </Group>
                        </Stack>
                    </Group>

                    <Stack align="flex-end" gap="xs" mt={{ base: 'md', md: 0 }}>
                        <Button variant="transparent" c="gray.4" size="sm" onClick={() => router.push("/superuser/flota/activos")}>
                            ← VOLVER AL INVENTARIO
                        </Button>
                        <Group gap="sm">
                            <Button size="md" color="dark.5" leftSection={<IconEdit size={20} color="#fab005" />} onClick={() => router.push(`/superuser/flota/activos/${activo.id}/editar`)} style={{ border: '1px solid #495057' }}>
                                EDITAR FICHA
                            </Button>
                            <Button size="md" color="blue.7" leftSection={<IconGauge size={20} />} onClick={() => setModalLecturaOpened(true)}>
                                LECTURA KM
                            </Button>
                            <Button size="md" color="red.7" leftSection={<IconClipboardCheck size={20} />} onClick={() => setModalFallaOpened(true)}>
                                REPORTAR FALLA
                            </Button>
                        </Group>
                    </Stack>
                </Group>
            </Box>

            {/* 🔥 CONTENEDOR PRINCIPAL 🔥 */}
            <Box px={{ base: 'md', xl: '3rem' }} mt="xl">

                {activo.estado === 'No Operativo' && (
                    <Alert variant="filled" color="red.8" title={<Text fw={900} size="lg" tt="uppercase">ALERTA ROJA: EQUIPO INOPERATIVO</Text>} icon={<IconAlertOctagon size={32} />} mb="xl" radius="md" style={{ borderLeft: '8px solid #c92a2a', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <Text fw={600} size="md">Este activo se encuentra detenido por hallazgos críticos de mantenimiento o documentación. Revise la pestaña de "Salud y Alertas" para ver los detalles.</Text>
                    </Alert>
                )}

                <Grid gutter="xl">
                    <Grid.Col span={{ base: 12, md: 3 }}>
                        <Stack gap="xl">

                            <Paper shadow="md" radius="sm" p={0} bg="white" style={{ overflow: 'hidden', borderBottom: '6px solid #fab005' }}>
                                <Box bg="dark.9" style={{ position: 'relative' }}>
                                    <Image
                                        src={activo.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${activo.imagen}?v=${process.env.NEXT_PUBLIC_APP_VERSION}` : null}
                                        h={250}
                                        fit="cover"
                                        fallbackSrc="https://placehold.co/400x300/212529/fab005?text=SIN+FOTO"
                                    />
                                    <Box style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', padding: '20px 15px 10px 15px' }}>
                                        <Text c="white" fw={900} size="xl">{activo.codigoInterno}</Text>
                                    </Box>
                                </Box>
                                <Stack p="xl" gap="md">
                                    <Box>
                                        <Text size="xs" fw={900} c="dark.3" tt="uppercase" mb={4}>Telemetría Base (Odómetro)</Text>
                                        <Group gap="xs" align="baseline">
                                            <IconDashboard size={24} color="#fab005" />
                                            <Text fw={900} size="xl" c="dark.9" style={{ fontSize: '2rem' }}>{fNum(activo.kilometrajeActual).toLocaleString()}</Text>
                                            <Text fw={700} c="dimmed">Km</Text>
                                        </Group>
                                    </Box>
                                    <Divider />
                                    <Group justify="space-between" align="center">
                                        <Text size="sm" fw={800} c="dark.5" tt="uppercase">Alertas de Salud:</Text>
                                        <Badge size="lg" radius="sm" color={hallazgosPendientes.length > 0 ? 'red.7' : 'green.7'} variant="filled">
                                            {hallazgosPendientes.length} Fallas Activas
                                        </Badge>
                                    </Group>
                                </Stack>
                            </Paper>

                            <Paper shadow="md" radius="sm" p="xl" bg="white" style={{ borderTop: '6px solid #343a40' }}>
                                <Group gap="xs" mb="lg">
                                    <IconEngine size={24} color="#343a40" />
                                    <Text fw={900} c="dark.9" size="lg" tt="uppercase">Ficha Técnica</Text>
                                </Group>

                                <Stack gap="md">
                                    <InfoLine label="S/N Motor" value={instance.serialMotor} />
                                    <InfoLine label="S/N Chasis" value={instance.serialChasis} />
                                    <InfoLine label="Combustible" value={plantilla.tipoCombustible} highlight />
                                    <InfoLine label="Cap. Carga" value={getCapacidadCarga()} />
                                    <InfoLine label="Tara (Vacío)" value={getTara()} />

                                    <Divider my="xs" variant="dashed" color="gray.4" />

                                    <Text fw={900} size="xs" c="teal.7" tt="uppercase">Valorización de Capital</Text>
                                    <InfoLine label="Valor Equipo" value={activo.valorReposicion ? `$${activo.valorReposicion.toLocaleString()}` : 'N/D'} />
                                    <InfoLine label="Valor Rescate" value={activo.valorSalvamento ? `$${activo.valorSalvamento.toLocaleString()}` : 'N/D'} />
                                    <InfoLine label="Vida Útil Est." value={activo.vidaUtilAnios ? `${activo.vidaUtilAnios} Años` : 'N/D'} />
                                    <InfoLine label="Depreciación" value={activo.costoPosesionHora ? `$${activo.costoPosesionHora.toFixed(2)} / hr` : 'N/D'} />
                                </Stack>
                            </Paper>
                        </Stack>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 9 }}>
                        <Paper shadow="md" radius="sm" p="xl" bg="white">

                            <Tabs defaultValue="alertas" color="yellow.6" variant="outline" radius="sm">
                                <Tabs.List mb="xl" bg="gray.0" p={5} style={{ borderRadius: '4px' }}>
                                    <Tabs.Tab value="alertas" leftSection={<IconAlertTriangle size={18} color={hallazgosPendientes.length ? "#e03131" : "#adb5bd"} />} fw={700}>
                                        SALUD
                                    </Tabs.Tab>
                                    <Tabs.Tab value="documentos" leftSection={<IconShieldCheck size={18} color={documentosFaltantes.length ? "#e03131" : "#495057"} />} fw={700}>
                                        DOC. LEGAL
                                    </Tabs.Tab>
                                    <Tabs.Tab value="mantenimiento" leftSection={<IconTool size={18} color="#495057" />} fw={700}>
                                        TALLER (ODT)
                                    </Tabs.Tab>
                                    <Tabs.Tab value="operaciones" leftSection={<IconRoute size={18} color="#495057" />} fw={700}>
                                        VIAJES
                                    </Tabs.Tab>
                                    <Tabs.Tab value="costos" leftSection={<IconCash size={18} color="#495057" />} fw={700}>
                                        COSTOS
                                    </Tabs.Tab>
                                    <Tabs.Tab value="componentes" leftSection={<IconSettings size={18} color="#495057" />} fw={700}>
                                        PIEZAS
                                    </Tabs.Tab>
                                    <Tabs.Tab value="uso" leftSection={<IconChartLine size={18} color="#495057" />} fw={700}>
                                        USO
                                    </Tabs.Tab>
                                </Tabs.List>

                                {/* 🔥 1. TAB: SALUD Y ALERTAS (RESTAURADO) 🔥 */}
                                <Tabs.Panel value="alertas">
                                    <Group justify="space-between" align="center" mb="xl">
                                        <Group align="center">
                                            <ThemeIcon size="lg" radius="md" variant="filled" color={hallazgosPendientes.length > 0 ? "red.8" : "teal.7"}>
                                                <IconAlertTriangle size={20} color="white" />
                                            </ThemeIcon>
                                            <Title order={3} c="dark.9" tt="uppercase">Estado de Salud y Reportes</Title>
                                        </Group>
                                        <Button color="red.7" radius="sm" leftSection={<IconClipboardCheck size={18} />} onClick={() => setModalFallaOpened(true)}>
                                            Reportar Falla o Novedad
                                        </Button>
                                    </Group>

                                    {hallazgosPendientes.length > 0 ? (
                                        <Timeline active={hallazgosPendientes.length} bulletSize={24} lineWidth={2} color="red">
                                            {hallazgosPendientes.map((hallazgo) => (
                                                <Timeline.Item key={hallazgo.id} bullet={<IconAlertTriangle size={12} />} title={<Text fw={900} size="md" tt="uppercase">{hallazgo.tipo}</Text>}>
                                                    <Paper withBorder p="md" mt="sm" radius="sm" shadow="xs" style={{ borderLeft: `6px solid ${hallazgo.severidad === 'Crítica' ? '#e03131' : '#fab005'}` }}>
                                                        <Group justify="space-between" align="flex-start" mb="xs">
                                                            <Text size="sm" c="dark.8" fw={600}>{hallazgo.descripcion}</Text>
                                                            <Badge color={hallazgo.severidad === 'Crítica' ? 'red' : 'yellow'} variant="filled" radius="sm">{hallazgo.severidad}</Badge>
                                                        </Group>
                                                        <Group gap="xl">
                                                            <Text size="xs" c="dimmed" fw={700}>ID: #{hallazgo.id}</Text>
                                                            <Text size="xs" c="dimmed" fw={700}>Reportado: {new Date(hallazgo.createdAt).toLocaleDateString()}</Text>
                                                            {hallazgo.observacion && <Text size="xs" c="gray.6" fs="italic">"{hallazgo.observacion}"</Text>}
                                                        </Group>
                                                        {hallazgo.estado === 'Pendiente' && (
                                                            <Group mt="md" justify="flex-end">
                                                                <Button size="xs" variant="light" color="blue" onClick={() => { setSelectedHallazgo(hallazgo); setModalOrdenOpened(true); }}>
                                                                    Generar ODT
                                                                </Button>
                                                            </Group>
                                                        )}
                                                    </Paper>
                                                </Timeline.Item>
                                            ))}
                                        </Timeline>
                                    ) : (
                                        <Alert color="teal.6" variant="outline" style={{ borderStyle: 'dashed', borderWidth: '2px' }} ta="center" py="xl">
                                            <Group justify="center" mb="sm"><IconCheck size={40} color="#12b886" /></Group>
                                            <Text fw={700} size="lg" c="teal.8">Equipo en óptimas condiciones. No hay fallas reportadas.</Text>
                                        </Alert>
                                    )}
                                </Tabs.Panel>

                                {/* 🔥 2. TAB: DOCUMENTOS LEGALES 🔥 */}
                                <Tabs.Panel value="documentos">
                                    <Group justify="space-between" align="center" mb="xl" wrap="wrap">
                                        <Group align="center">
                                            <ThemeIcon size="lg" radius="md" variant="filled" color="dark.8"><IconShieldCheck size={20} color="#fab005" /></ThemeIcon>
                                            <Title order={3} c="dark.9" tt="uppercase">Expediente Legal del Equipo</Title>
                                        </Group>
                                        <Button color="blue.7" radius="sm" leftSection={<IconPlus size={18} />} onClick={() => setModalDocOpened(true)}>
                                            Anexar Documento
                                        </Button>
                                    </Group>

                                    {documentosFaltantes.length > 0 && (
                                        <Alert variant="filled" color="red.7" title={<Text fw={900} size="md" tt="uppercase">Documentación Incompleta</Text>} icon={<IconAlertTriangle size={24} />} mb="xl" radius="sm">
                                            <Stack gap="xs">
                                                <Text size="sm" fw={600}>Para cumplir con las normativas viales/legales, debe anexar los siguientes documentos obligatorios:</Text>
                                                <Group gap="xs">
                                                    {documentosFaltantes.map(f => <Badge key={f} color="dark.9" variant="filled" radius="sm">{f}</Badge>)}
                                                </Group>
                                            </Stack>
                                        </Alert>
                                    )}

                                    {activo.documentos?.length === 0 ? (
                                        <Paper withBorder p="xl" bg="gray.0" ta="center" radius="sm" style={{ borderStyle: 'dashed', borderWidth: '2px' }}>
                                            <ThemeIcon size={60} radius="md" variant="light" color="dark" mb="md"><IconFileText size={40} /></ThemeIcon>
                                            <Title order={4} c="dark.8" tt="uppercase">Expediente Vacío</Title>
                                            <Text c="dimmed" size="sm" mb="md" fw={600}>Comience a escanear la documentación de este activo.</Text>
                                            <Button variant="outline" color="dark.8" onClick={() => setModalDocOpened(true)}>Cargar Primer Documento</Button>
                                        </Paper>
                                    ) : (
                                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                                            {activo.documentos?.map(doc => {
                                                // 🔥 Evaluamos si el documento tiene fecha o es PERMANENTE 🔥
                                                const esPermanente = !doc.fechaVencimiento;

                                                let estaVencido = false;
                                                let estaPorVencer = false;
                                                let diasRestantes = null;

                                                let badgeColor = 'blue.7'; // Color por defecto para permanentes (Azul corporativo)
                                                let borderColor = '#ced4da'; // Borde por defecto

                                                if (!esPermanente) {
                                                    const hoy = new Date();
                                                    const fechaVencimiento = new Date(doc.fechaVencimiento);
                                                    diasRestantes = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));

                                                    estaVencido = diasRestantes < 0;
                                                    estaPorVencer = diasRestantes >= 0 && diasRestantes <= 30;

                                                    badgeColor = 'green.7'; // Es temporal y está vigente
                                                    if (estaVencido) { badgeColor = 'red.7'; borderColor = '#e03131'; }
                                                    else if (estaPorVencer) { badgeColor = 'orange.6'; borderColor = '#fd7e14'; }
                                                }

                                                return (
                                                    <Card key={doc.id} padding="md" radius="sm" withBorder style={{ borderTop: `4px solid ${borderColor}`, backgroundColor: '#f8f9fa' }}>
                                                        <Group justify="space-between" mb="sm" wrap="nowrap" align="flex-start">
                                                            <Group gap={8} style={{ flex: 1 }}>
                                                                <IconShieldCheck size={20} color={`var(--mantine-color-${badgeColor})`} />
                                                                <Text fw={900} size="sm" c="dark.8" tt="uppercase" style={{ lineHeight: 1.2 }}>{doc.tipo}</Text>
                                                            </Group>
                                                        </Group>

                                                        {/* Vista Previa de la Imagen (AHORA CLICKEABLE) */}
                                                        <Box
                                                            bg="dark.8"
                                                            onClick={() => {
                                                                if (doc.imagen) {
                                                                    setDocPreview({
                                                                        url: `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${doc.imagen}?v=${process.env.NEXT_PUBLIC_APP_VERSION}`,
                                                                        tipo: doc.tipo,
                                                                        filename: doc.imagen
                                                                    });
                                                                }
                                                            }}
                                                            style={{
                                                                borderRadius: 4, overflow: 'hidden', height: 160, position: 'relative',
                                                                cursor: doc.imagen ? 'pointer' : 'default',
                                                                transition: 'transform 0.2s ease',
                                                            }}
                                                            mb="md"
                                                            onMouseEnter={(e) => { if (doc.imagen) e.currentTarget.style.transform = 'scale(1.02)'; }}
                                                            onMouseLeave={(e) => { if (doc.imagen) e.currentTarget.style.transform = 'scale(1)'; }}
                                                        >
                                                            {doc.imagen ? (
                                                                <>
                                                                    <Image
                                                                        src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${doc.imagen}?v=${process.env.NEXT_PUBLIC_APP_VERSION}`}
                                                                        fit="cover" h="100%" w="100%" alt="Documento"
                                                                    />
                                                                    {/* Icono flotante indicador de "Ampliar" */}
                                                                    <ThemeIcon size="md" radius="sm" color="dark.9" style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.8 }}>
                                                                        <IconMaximize size={16} color="white" />
                                                                    </ThemeIcon>
                                                                </>
                                                            ) : (
                                                                <Center h="100%">
                                                                    <Stack align="center" gap={4}>
                                                                        <IconPhoto size={30} color="#495057" />
                                                                        <Text size="xs" c="dimmed" fw={600}>Sin Escáner</Text>
                                                                    </Stack>
                                                                </Center>
                                                            )}

                                                            {/* Overlay de Vencido */}
                                                            {!esPermanente && estaVencido && (
                                                                <Box style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(224, 49, 49, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Badge color="red.9" variant="filled" size="lg" radius="sm">DOCUMENTO INVÁLIDO</Badge>
                                                                </Box>
                                                            )}
                                                        </Box>

                                                        <Stack gap={4}>
                                                            <Group justify="space-between" align="center">
                                                                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Vencimiento</Text>
                                                                <Badge size="sm" color={badgeColor} variant={estaVencido || estaPorVencer ? "filled" : "light"} radius="sm">
                                                                    {esPermanente ? 'PERMANENTE' : new Date(doc.fechaVencimiento).toLocaleDateString('es-VE')}
                                                                </Badge>
                                                            </Group>
                                                            <Group justify="space-between" align="center">
                                                                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Referencia</Text>
                                                                <Text size="xs" fw={800} c="dark.7">{doc.numeroDocumento || 'S/N'}</Text>
                                                            </Group>

                                                            {/* Alerta Semáforo Condicional */}
                                                            {!esPermanente && (estaPorVencer || estaVencido) && (
                                                                <Text size="xs" fw={800} c={estaVencido ? 'red.7' : 'orange.7'} ta="center" mt="xs" bg={estaVencido ? 'red.0' : 'orange.0'} py={4} style={{ borderRadius: 4 }}>
                                                                    {estaVencido ? `Vencido hace ${Math.abs(diasRestantes)} días` : `Atención: Vence en ${diasRestantes} días`}
                                                                </Text>
                                                            )}
                                                        </Stack>
                                                    </Card>
                                                );
                                            })}
                                        </SimpleGrid>
                                    )}
                                </Tabs.Panel>

                                {/* 3. TAB: TALLER (ODT) */}
                                <Tabs.Panel value="mantenimiento">
                                    <Group align="center" mb="xl">
                                        <ThemeIcon size="lg" radius="md" variant="filled" color="dark.8"><IconTool size={20} color="#fab005" /></ThemeIcon>
                                        <Title order={3} c="dark.9" tt="uppercase">Órdenes de Trabajo Activas</Title>
                                    </Group>

                                    <Grid gutter="xl">
                                        {activo.ordenesMantenimiento?.map(odt => (
                                            <Grid.Col span={{ base: 12, md: 6 }} key={odt.id}>
                                                <Card withBorder padding="xl" radius="sm" shadow="sm" style={{ borderLeft: `8px solid ${odt.estado === 'Esperando Stock' ? '#fd7e14' : '#228be6'}` }}>
                                                    <Group justify="space-between" mb="md">
                                                        <Text fw={900} size="xl" c="dark.8">{odt.codigo}</Text>
                                                        <Badge radius="sm" size="lg" color={odt.estado === 'Esperando Stock' ? 'orange.6' : 'blue.6'} variant="filled">{odt.estado}</Badge>
                                                    </Group>
                                                    <Group gap="xs" mb="lg">
                                                        <Badge variant="outline" color="dark.5" radius="sm">{odt.tipo}</Badge>
                                                        <Badge variant="outline" color={odt.prioridad === 'Alta' ? 'red' : 'gray'} radius="sm">{odt.prioridad}</Badge>
                                                    </Group>

                                                    <Text size="xs" fw={800} c="dimmed" tt="uppercase" mb="xs">Repuestos Requeridos:</Text>
                                                    <Stack gap="xs">
                                                        {odt.repuestos?.map(rep => (
                                                            <Paper key={rep.id} withBorder p="xs" bg="gray.0" radius="sm">
                                                                <Group justify="space-between">
                                                                    <Text size="sm" fw={700} c="dark.7">{rep.consumible?.nombre}</Text>
                                                                    <Badge size="xs" color={rep.estado === 'Sin Stock' ? 'red.6' : 'green.6'} variant="filled" radius="sm">
                                                                        {rep.estado}
                                                                    </Badge>
                                                                </Group>
                                                            </Paper>
                                                        ))}
                                                        {(!odt.repuestos?.length) && <Text size="sm" fs="italic" c="dimmed">Solo mano de obra.</Text>}
                                                    </Stack>
                                                </Card>
                                            </Grid.Col>
                                        ))}
                                        {(!activo.ordenesMantenimiento?.length) && (
                                            <Grid.Col span={12}>
                                                <Alert color="gray.6" variant="outline" style={{ borderStyle: 'dashed', borderWidth: '2px' }} ta="center" py="xl">
                                                    <Text fw={700} size="lg">No hay ODTs abiertas para este equipo en el taller.</Text>
                                                </Alert>
                                            </Grid.Col>
                                        )}
                                    </Grid>
                                </Tabs.Panel>

                                {/* 4. TAB: OPERACIONES */}
                                <Tabs.Panel value="operaciones">
                                    <Group align="center" mb="xl">
                                        <ThemeIcon size="lg" radius="md" variant="filled" color="dark.8"><IconRoute size={20} color="#fab005" /></ThemeIcon>
                                        <Title order={3} c="dark.9" tt="uppercase">Misiones de Ruta Históricas</Title>
                                    </Group>

                                    {fletesHistoricos?.length > 0 ? (
                                        <Box style={{ overflowX: 'auto' }}>
                                            <Table striped highlightOnHover withTableBorder verticalSpacing="md">
                                                <Table.Thead bg="gray.2">
                                                    <Table.Tr>
                                                        <Table.Th><Text c="dark.8" fw={900} tt="uppercase">Nro Misión</Text></Table.Th>
                                                        <Table.Th><Text c="dark.8" fw={900} tt="uppercase">Fecha Carga</Text></Table.Th>
                                                        <Table.Th><Text c="dark.8" fw={900} tt="uppercase">Trazado Geográfico</Text></Table.Th>
                                                        <Table.Th><Text c="dark.8" fw={900} tt="uppercase">Estado Operativo</Text></Table.Th>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {fletesHistoricos.map(f => (
                                                        <Table.Tr key={f.id}>
                                                            <Table.Td fw={900} c="blue.8" fz="lg">#{f.nroFlete || f.id}</Table.Td>
                                                            <Table.Td fw={600} c="dark.7">{new Date(f.fechaCarga).toLocaleDateString() || 'N/D'}</Table.Td>
                                                            <Table.Td fw={700} c="dark.6">{f.origen || 'Base'} ➔ {f.destino || 'Destino'}</Table.Td>
                                                            <Table.Td><Badge size="md" radius="sm" color="dark.6">{f.estado}</Badge></Table.Td>
                                                        </Table.Tr>
                                                    ))}
                                                </Table.Tbody>
                                            </Table>
                                        </Box>
                                    ) : (
                                        <Alert color="gray.6" variant="outline" style={{ borderStyle: 'dashed', borderWidth: '2px' }} ta="center" py="xl">
                                            <Text fw={700} size="lg">El sistema no registra misiones logísticas para este activo.</Text>
                                        </Alert>
                                    )}
                                </Tabs.Panel>

                                {/* 5. TAB: COSTOS */}
                                <Tabs.Panel value="costos">
                                    <Group align="center" mb="lg">
                                        <ThemeIcon size="lg" radius="md" variant="filled" color="dark.8"><IconCash size={20} color="#fab005" /></ThemeIcon>
                                        <Title order={3} c="dark.9" tt="uppercase">Perfil Financiero y Matriz</Title>
                                    </Group>

                                    <Alert variant="filled" color="dark.8" mb="xl" icon={<IconInfoCircle size={24} color="#fab005" />} style={{ borderLeft: '6px solid #fab005' }}>
                                        <Text c="white" fw={500}>Los costos base presentados derivan de la configuración global de la <b>Matriz: {activo.matrizCosto?.nombre || 'Genérica no asignada'}</b> y la valorización de este equipo.</Text>
                                    </Alert>

                                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mb="xl">
                                        <Paper withBorder p="xl" radius="sm" ta="center" bg="gray.1" shadow="xs" style={{ borderBottom: '4px solid #228be6' }}>
                                            <Text size="sm" c="gray.6" fw={900} tt="uppercase" mb="xs">Costo Variable (Mecánica)</Text>
                                            <Text fw={900} style={{ fontSize: '3rem', lineHeight: 1.2 }} c="blue.7">${totalMatrizKm.toFixed(2)}</Text>
                                            <Text size="sm" c="gray.6" fw={700}>por KM recorrido</Text>
                                        </Paper>
                                        <Paper withBorder p="xl" radius="sm" ta="center" bg="dark.8" shadow="md" style={{ borderBottom: '4px solid #fd7e14' }}>
                                            <Text size="sm" c="yellow.5" fw={900} tt="uppercase" mb="xs">Costo Fijo (Sobrecarga)</Text>
                                            <Text fw={900} style={{ fontSize: '3rem', lineHeight: 1.2 }} c="white">${totalMatrizHr.toFixed(2)}</Text>
                                            <Text size="sm" c="gray.4" fw={700}>por HORA operativa</Text>
                                        </Paper>
                                        <Paper withBorder p="xl" radius="sm" ta="center" bg="teal.0" shadow="xs" style={{ border: '2px solid #20c997', borderBottom: '4px solid #099268' }}>
                                            <Text size="sm" c="teal.9" fw={900} tt="uppercase" mb="xs">Costo de Posesión</Text>
                                            <Text fw={900} style={{ fontSize: '3rem', lineHeight: 1.2 }} c="teal.9">${activo.costoPosesionHora?.toFixed(2) || '0.00'}</Text>
                                            <Text size="sm" c="teal.8" fw={700}>Depreciación por HORA</Text>
                                        </Paper>
                                    </SimpleGrid>

                                    <Box mt="xl" p="xl" bg="gray.0" style={{ borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                        <Text fw={900} c="dark.8" size="lg" tt="uppercase" mb="lg" style={{ borderBottom: '2px solid #fab005', display: 'inline-block', paddingBottom: '4px' }}>
                                            Desglose de Mantenimiento Teórico Programado
                                        </Text>
                                        <Box style={{ overflowX: 'auto' }}>
                                            <Table withTableBorder striped highlightOnHover>
                                                <Table.Thead bg="dark.6">
                                                    <Table.Tr>
                                                        <Table.Th c="white"><Text fw={900} tt="uppercase">Concepto</Text></Table.Th>
                                                        <Table.Th c="white"><Text fw={900} tt="uppercase">Frecuencia / Vida Útil</Text></Table.Th>
                                                        <Table.Th ta="right" c="white"><Text fw={900} tt="uppercase">Costo Estimado</Text></Table.Th>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {activo.matrizCosto?.detalles?.map(det => (
                                                        <Table.Tr key={det.id}>
                                                            <Table.Td fw={700} c="dark.7">{det.descripcion}</Table.Td>
                                                            <Table.Td fw={600} c="dimmed">Cada {det.frecuencia} {det.tipoDesgaste}</Table.Td>
                                                            <Table.Td ta="right" fw={800} c="dark.9" fz="lg">${det.costoUnitario?.toFixed(2)}</Table.Td>
                                                        </Table.Tr>
                                                    ))}
                                                    {(!activo.matrizCosto?.detalles?.length) && (
                                                        <Table.Tr>
                                                            <Table.Td colSpan={3} ta="center" c="dimmed" py="xl" fs="italic" fw={600}>
                                                                No hay ítems registrados en la matriz de este equipo.
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    )}
                                                </Table.Tbody>
                                            </Table>
                                        </Box>
                                    </Box>
                                </Tabs.Panel>

                                {/* 6. TAB: COMPONENTES */}
                                <Tabs.Panel value="componentes">
                                    <Group align="center" mb="xl">
                                        <ThemeIcon size="lg" radius="md" variant="filled" color="dark.8"><IconSettings size={20} color="#fab005" /></ThemeIcon>
                                        <Title order={3} c="dark.9" tt="uppercase">Control de Piezas e Inventario Físico</Title>
                                    </Group>

                                    <Stack gap="lg">
                                        {subsistemas.map((sub) => {
                                            const recomendaciones = sub.subsistemaPlantilla?.listaRecomendada || [];
                                            const instalaciones = sub.instalaciones || [];

                                            return (
                                                <Accordion variant="separated" radius="sm" key={sub.id} defaultValue="open">
                                                    <Accordion.Item value="open" style={{ backgroundColor: '#ffffff', border: '1px solid #ced4da', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                                        <Accordion.Control p="md">
                                                            <Group justify="space-between" pr="md">
                                                                <Text fw={900} size="lg" c="dark.8" tt="uppercase">{sub.nombre}</Text>
                                                                <Badge size="lg" variant="filled" color="dark.8" radius="sm">{recomendaciones.length} Elementos Auditables</Badge>
                                                            </Group>
                                                        </Accordion.Control>
                                                        <Accordion.Panel p="sm">
                                                            <Table verticalSpacing="sm" withTableBorder striped>
                                                                <Table.Thead bg="gray.2">
                                                                    <Table.Tr>
                                                                        <Table.Th><Text c="dark.8" fw={900} tt="uppercase">Pieza / Componente</Text></Table.Th>
                                                                        <Table.Th><Text c="dark.8" fw={900} tt="uppercase">Nivel de Integridad</Text></Table.Th>
                                                                        <Table.Th ta="right"><Text c="dark.8" fw={900} tt="uppercase">Acción Taller</Text></Table.Th>
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
                                                                                    <Text size="md" fw={800} c="dark.7">{rec.label || rec.categoria}</Text>
                                                                                    <Group gap="xs" mt={8}>
                                                                                        {matches.map(inst => (
                                                                                            <Badge
                                                                                                key={inst.id} size="md" color="dark.4" variant="outline" radius="sm"
                                                                                                rightSection={
                                                                                                    <ActionIcon size="xs" color="red" variant="transparent" onClick={() => { setItemToUninstall(inst); setModalUninstallOpened(true); }}>
                                                                                                        <IconX size={12} />
                                                                                                    </ActionIcon>
                                                                                                }
                                                                                            >
                                                                                                {inst.fichaTecnica.nombre}
                                                                                            </Badge>
                                                                                        ))}
                                                                                    </Group>
                                                                                </Table.Td>
                                                                                <Table.Td>
                                                                                    <Badge size="lg" radius="sm" color={estaCompleto ? 'green.7' : 'orange.6'} variant="filled">
                                                                                        {cantidadInstalada} / {recCantidad} Instalados
                                                                                    </Badge>
                                                                                </Table.Td>
                                                                                <Table.Td ta="right">
                                                                                    <Button size="xs" radius="sm" variant="light" color="blue.7" leftSection={<IconPlus size={14} />} onClick={() => {
                                                                                        setSelectedItem({ sub: sub, rec: { ...rec, cantidad: recCantidad, label: rec.label || rec.categoria } });
                                                                                        setModalInstallOpened(true);
                                                                                    }}>
                                                                                        Instalar Parte
                                                                                    </Button>
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

                                {/* 7. TAB: USO */}
                                <Tabs.Panel value="uso">
                                    <Group align="center" mb="xl">
                                        <ThemeIcon size="lg" radius="md" variant="filled" color="dark.8"><IconChartLine size={20} color="#fab005" /></ThemeIcon>
                                        <Title order={3} c="dark.9" tt="uppercase">Telemetría de Rendimiento</Title>
                                    </Group>

                                    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
                                        <Paper withBorder p="xl" radius="sm" shadow="sm">
                                            <Text fw={900} size="md" c="dark.6" tt="uppercase" mb="xl" style={{ borderBottom: '2px solid #228be6', display: 'inline-block', paddingBottom: '4px' }}>
                                                Curva de Desgaste (Kilometraje)
                                            </Text>
                                            <AreaChart h={280} data={dataKilometraje} dataKey="fecha" series={[{ name: 'valor', color: 'blue.6' }]} curveType="monotone" withGradient />
                                        </Paper>
                                        <Paper withBorder p="xl" radius="sm" shadow="sm">
                                            <Text fw={900} size="md" c="dark.6" tt="uppercase" mb="xl" style={{ borderBottom: '2px solid #20c997', display: 'inline-block', paddingBottom: '4px' }}>
                                                Rendimiento de Combustible (Km/L)
                                            </Text>
                                            <BarChart h={280} data={dataEficiencia} dataKey="fecha" series={[{ name: 'rendimiento', color: 'teal.6' }]} radius={4} />
                                        </Paper>
                                    </SimpleGrid>
                                </Tabs.Panel>
                            </Tabs>
                        </Paper>
                    </Grid.Col>
                </Grid>
            </Box>

            {/* 🔥 MODALES: ¡AQUÍ ESTÁ LA CORRECCIÓN CLAVE! 🔥 */}
            <Modal opened={modalOrdenOpened} onClose={() => setModalOrdenOpened(false)} title={<Text fw={900} size="lg" tt="uppercase">Generar ODT</Text>} centered radius="md">
                {selectedHallazgo && (
                    <Stack>
                        <Alert color="blue.7" icon={<IconInfoCircle />}>Atendiendo: <b>{selectedHallazgo.descripcion}</b></Alert>
                        <Button color="dark.9" radius="sm" size="md" onClick={() => { notifications.show({ title: 'Orden Creada', color: 'green' }); setModalOrdenOpened(false); }}>Confirmar Apertura</Button>
                    </Stack>
                )}
            </Modal>

            <ModalReportarFalla opened={modalFallaOpened} onClose={() => setModalFallaOpened(false)} activo={activo} userId={userId} onSuccess={fetchData} />
            <ModalActualizarLectura opened={modalLecturaOpened} onClose={() => setModalLecturaOpened(false)} activo={activo} userId={userId} onSuccess={fetchData} />
            <ModalInstallComponente opened={modalInstallOpened} onClose={() => { setModalInstallOpened(false); setSelectedItem(null); }} target={selectedItem} activoId={activo.id} onSuccess={fetchData} />
            <ModalDesinstalarComponente opened={modalUninstallOpened} onClose={() => setModalUninstallOpened(false)} item={itemToUninstall} onSuccess={fetchData} />

            {/* AQUÍ FALTA TU MODAL DE DOCUMENTOS, LO AGREGO: */}
            <ModalAgregarDocumento
                opened={modalDocOpened}
                onClose={() => setModalDocOpened(false)}
                activoId={activo.id}
                tipoActivo={activo.tipoActivo}
                codigoInterno={activo.codigoInterno} // 🔥 LÍNEA NUEVA 🔥
                onSuccess={fetchData}
            />
            {/* 🔥 MODAL VISOR DE DOCUMENTOS (CON IMPRIMIR/DESCARGAR) 🔥 */}
            <Modal 
                opened={!!docPreview} 
                onClose={() => setDocPreview(null)} 
                size="auto" 
                centered 
                withCloseButton={false}
                padding={0}
                overlayProps={{ blur: 5, opacity: 0.8, color: '#212529' }}
            >
                {docPreview && (
                    <Box bg="dark.9" p="md" style={{ borderRadius: '8px', border: '1px solid #495057' }}>
                        <Group justify="space-between" mb="md" align="center">
                            <Group gap="xs">
                                <IconShieldCheck size={24} color="#fab005" />
                                <Text fw={900} size="lg" tt="uppercase" c="white">{docPreview.tipo}</Text>
                            </Group>
                            <ActionIcon color="gray.4" variant="subtle" onClick={() => setDocPreview(null)}>
                                <IconX size={20} />
                            </ActionIcon>
                        </Group>

                        <Box style={{ backgroundColor: '#ffffff', borderRadius: '4px', padding: '4px' }}>
                            <Image 
                                src={docPreview.url} 
                                fit="contain" 
                                style={{ maxHeight: '75vh', width: 'auto', margin: '0 auto', display: 'block' }} 
                            />
                        </Box>

                        <Group justify="center" mt="md" gap="md">
                            <Button 
                                size="md" radius="sm" color="blue.7" 
                                leftSection={<IconDownload size={20} />} 
                                onClick={() => handleDownloadDoc(docPreview.url, docPreview.filename)}
                            >
                                DESCARGAR
                            </Button>
                            <Button 
                                size="md" radius="sm" color="teal.7" 
                                leftSection={<IconPrinter size={20} />} 
                                onClick={() => handlePrintDoc(docPreview.url)}
                            >
                                IMPRIMIR
                            </Button>
                        </Group>
                    </Box>
                )}
            </Modal>
        </Box>
    );
}

const InfoLine = ({ label, value, highlight }) => (
    <Group justify="space-between" style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '4px' }}>
        <Text size="sm" c="gray.6" fw={700} tt="uppercase">{label}</Text>
        <Text size="md" fw={900} c={highlight ? "yellow.6" : "dark.8"}>{value || '---'}</Text>
    </Group>
);