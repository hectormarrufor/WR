'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Container, Grid, Paper, Image, Title, Text, Badge, Group, Button, 
    Tabs, ThemeIcon, Stack, Divider, LoadingOverlay, Modal, SimpleGrid,
    Box, Timeline, Card, Avatar, RingProgress, Center, Alert
} from '@mantine/core';
import { 
    IconArrowLeft, IconPencil, IconTrash, IconTruck, IconCalendar, 
    IconBarcode, IconEngine, IconColorSwatch, IconWeight, IconRuler,
    IconSettings, IconTool, IconClipboardCheck, IconGasStation, IconInfoCircle
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';

export default function DetalleActivoPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const { isAdmin } = useAuth();

    const [activo, setActivo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalDeleteOpened, setModalDeleteOpened] = useState(false);

    useEffect(() => {
        const fetchActivo = async () => {
            try {
                const response = await fetch(`/api/gestionMantenimiento/activos/${id}`);
                if (!response.ok) throw new Error('Error al cargar el activo');
                const result = await response.json();
                setActivo(result.data);
            } catch (error) {
                notifications.show({ title: 'Error', message: error.message, color: 'red' });
                router.push('/superuser/flota/activos');
            } finally {
                setLoading(false);
            }
        };
        fetchActivo();
    }, [id, router]);

    // Helper para extraer la instancia específica (Vehículo, Remolque o Máquina)
    const getInstanceData = () => {
        if (!activo) return null;
        return activo.vehiculoInstancia || activo.remolqueInstancia || activo.maquinaInstancia || {};
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/gestionMantenimiento/activos/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error al eliminar');
            notifications.show({ title: 'Eliminado', message: 'Activo eliminado correctamente', color: 'green' });
            router.push('/superuser/flota/activos');
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
            setLoading(false);
            setModalDeleteOpened(false);
        }
    };

    if (loading || !activo) return <LoadingOverlay visible={true} zIndex={1000} />;

    // Extracción de datos para renderizado limpio
    const instance = getInstanceData();
    const plantilla = instance?.plantilla || {};
    const subsistemas = activo.subsistemasInstancia || [];
    const mantenimientos = activo.mantenimientos || [];
    const inspecciones = activo.inspecciones || [];
    
    // URLs de imagenes
    const assetImage = activo.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${activo.imagen}` : null;
    const modelImage = plantilla.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${plantilla.imagen}` : null;

    // Componente auxiliar para filas de datos
    const DataRow = ({ icon: Icon, label, value, subValue }) => (
        <Group align="flex-start" wrap="nowrap">
            <ThemeIcon variant="light" color="blue.1" c="blue.7" size="lg" radius="md">
                <Icon size={20} />
            </ThemeIcon>
            <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
                <Text size="sm" fw={600} c="dark.4">{value || 'N/A'}</Text>
                {subValue && <Text size="xs" c="dimmed">{subValue}</Text>}
            </div>
        </Group>
    );

    return (
        <Container size="xl" py="xl">
            {/* Header de Navegación */}
            <Group justify="space-between" mb="lg">
                <Button variant="subtle" leftSection={<IconArrowLeft size={18} />} onClick={() => router.back()} color="gray">
                    Volver
                </Button>
                {isAdmin && (
                    <Group>
                        <Button leftSection={<IconPencil size={18} />} variant="default" onClick={() => router.push(`/superuser/flota/activos/${id}/editar`)}>
                            Editar
                        </Button>
                        <Button leftSection={<IconTrash size={18} />} color="red" onClick={() => setModalDeleteOpened(true)}>
                            Eliminar
                        </Button>
                    </Group>
                )}
            </Group>

            <Grid gutter="xl">
                {/* COLUMNA IZQUIERDA: Identidad, Foto y Subsistemas */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Stack>
                        {/* Tarjeta Principal */}
                        <Paper shadow="sm" radius="md" p="md" withBorder>
                            <Stack align="center">
                                <Box w="100%" h={250} bg="gray.1" style={{ borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                                    {assetImage ? (
                                        <Image src={assetImage} h={250} w="100%" fit="cover" alt={activo.codigoInterno} />
                                    ) : (
                                        <IconTruck size={80} color="#adb5bd" />
                                    )}
                                    <Badge 
                                        size="lg" 
                                        color={activo.estado === 'Operativo' ? 'teal' : 'red'} 
                                        variant="filled"
                                        style={{ position: 'absolute', top: 10, right: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                                    >
                                        {activo.estado}
                                    </Badge>
                                </Box>

                                <div style={{ width: '100%', textAlign: 'center' }}>
                                    <Title order={2}>{activo.codigoInterno}</Title>
                                    <Text c="dimmed" fw={500}>{plantilla.marca} {plantilla.modelo}</Text>
                                </div>

                                <Divider w="100%" />

                                <SimpleGrid cols={2} w="100%">
                                    <div>
                                        <Text c="dimmed" size="xs">TIPO</Text>
                                        <Text fw={600}>{activo.tipoActivo}</Text>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <Text c="dimmed" size="xs">UBICACIÓN</Text>
                                        <Text fw={600}>{activo.ubicacionActual}</Text>
                                    </div>
                                </SimpleGrid>
                            </Stack>
                        </Paper>

                        {/* Tarjeta de Subsistemas (Motores, Cajas, etc) */}
                        <Paper shadow="sm" radius="md" p="md" withBorder>
                            <Group justify="space-between" mb="md">
                                <Title order={5}>Componentes Serializados</Title>
                                <Badge variant="outline" color="gray">{subsistemas.length}</Badge>
                            </Group>
                            
                            {subsistemas.length > 0 ? (
                                <Stack gap="xs">
                                    {subsistemas.map((sub) => (
                                        <Card key={sub.id} withBorder padding="sm" radius="sm" bg="gray.0">
                                            <Group align="flex-start" wrap="nowrap">
                                                <ThemeIcon color="orange" variant="light">
                                                    <IconSettings size={16} />
                                                </ThemeIcon>
                                                <div>
                                                    {/* Lógica corregida: Usa sub.nombre directamente */}
                                                    <Text size="sm" fw={600}>{sub.nombre}</Text>
                                                    <Text size="xs" c="dimmed">
                                                        Instalado: {new Date(sub.createdAt).toLocaleDateString()}
                                                    </Text>
                                                </div>
                                            </Group>
                                        </Card>
                                    ))}
                                </Stack>
                            ) : (
                                <Alert icon={<IconInfoCircle size={16}/>} color="gray" variant="light">
                                    No hay componentes mayores registrados.
                                </Alert>
                            )}
                        </Paper>
                    </Stack>
                </Grid.Col>


                {/* COLUMNA DERECHA: Ficha Técnica y Trazabilidad */}
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Paper shadow="sm" radius="md" p="xl" withBorder h="100%">
                        <Tabs defaultValue="specs" color="teal">
                            <Tabs.List mb="lg">
                                <Tabs.Tab value="specs" leftSection={<IconTruck size={18} />}>
                                    Ficha Técnica
                                </Tabs.Tab>
                                <Tabs.Tab value="capacities" leftSection={<IconWeight size={18} />}>
                                    Pesos y Capacidades
                                </Tabs.Tab>
                                <Tabs.Tab value="traceability" leftSection={<IconClipboardCheck size={18} />}>
                                    Trazabilidad
                                </Tabs.Tab>
                            </Tabs.List>

                            {/* TAB 1: ESPECIFICACIONES (Fusión de Instancia + Plantilla) */}
                            <Tabs.Panel value="specs">
                                <Title order={4} mb="md" c="dimmed">Identificación de la Unidad</Title>
                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" verticalSpacing="xl">
                                    <DataRow icon={IconBarcode} label="Placa / Patente" value={instance.placa} />
                                    <DataRow icon={IconColorSwatch} label="Color" value={instance.color} />
                                    <DataRow icon={IconEngine} label="Serial Motor" value={instance.serialMotor} />
                                    <DataRow icon={IconBarcode} label="Serial Chasis (VIN)" value={instance.serialChasis} />
                                    
                                    <DataRow icon={IconCalendar} label="Año Fabricación" value={plantilla.anio} />
                                    <DataRow icon={IconGasStation} label="Combustible" value={plantilla.tipoCombustible} />
                                </SimpleGrid>

                                <Divider my="xl" label="Detalles del Modelo Base" labelPosition="center" />
                                
                                <Group align="flex-start">
                                    {modelImage && (
                                        <Image src={modelImage} w={100} radius="md" alt="Modelo Ref" />
                                    )}
                                    <SimpleGrid cols={2} style={{ flex: 1 }}>
                                        <DataRow icon={IconTruck} label="Marca" value={plantilla.marca} />
                                        <DataRow icon={IconTruck} label="Modelo" value={plantilla.modelo} />
                                        <DataRow icon={IconRuler} label="Número de Ejes" value={plantilla.numeroEjes} />
                                        <DataRow icon={IconTruck} label="Clase" value={plantilla.tipoVehiculo} />
                                    </SimpleGrid>
                                </Group>
                            </Tabs.Panel>


                            {/* TAB 2: CAPACIDADES (Visualización de datos numéricos) */}
                            <Tabs.Panel value="capacities">
                                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mt="md">
                                    <Paper withBorder p="md" radius="md" bg="gray.0">
                                        <Stack align="center" gap={5}>
                                            <IconWeight size={30} color="gray" />
                                            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Peso Tara</Text>
                                            <Text size="xl" fw={700}>{plantilla.peso || 0} <Text span size="sm" fw={400}>Ton</Text></Text>
                                        </Stack>
                                    </Paper>
                                    
                                    <Paper withBorder p="md" radius="md" bg="blue.0">
                                        <Stack align="center" gap={5}>
                                            <IconTruck size={30} color="#228be6" />
                                            <Text c="blue.8" size="xs" tt="uppercase" fw={700}>Cap. Arrastre</Text>
                                            <Text size="xl" fw={700} c="blue.9">{plantilla.capacidadArrastre || 0} <Text span size="sm" fw={400}>Ton</Text></Text>
                                        </Stack>
                                    </Paper>

                                    <Paper withBorder p="md" radius="md" bg="teal.0">
                                        <Stack align="center" gap={5}>
                                            <IconWeight size={30} color="#12b886" />
                                            <Text c="teal.8" size="xs" tt="uppercase" fw={700}>Peso Max Comb.</Text>
                                            <Text size="xl" fw={700} c="teal.9">{plantilla.pesoMaximoCombinado || 0} <Text span size="sm" fw={400}>Ton</Text></Text>
                                        </Stack>
                                    </Paper>
                                </SimpleGrid>

                                <Box mt="xl">
                                    <Text size="sm" c="dimmed" mb="xs">Relación Peso / Capacidad</Text>
                                    {plantilla.peso && plantilla.pesoMaximoCombinado && (
                                        <Group grow>
                                            <Paper withBorder p="xs">
                                                <Text size="xs" ta="center">Tara: {plantilla.peso}T</Text>
                                                <div style={{ height: 10, background: '#e9ecef', borderRadius: 5, marginTop: 5 }}>
                                                    <div style={{ width: '100%', height: '100%', background: '#adb5bd', borderRadius: 5 }}></div>
                                                </div>
                                            </Paper>
                                            <Paper withBorder p="xs">
                                                <Text size="xs" ta="center">Carga Útil Teórica: {(plantilla.pesoMaximoCombinado - plantilla.peso).toFixed(1)}T</Text>
                                                <div style={{ height: 10, background: '#e9ecef', borderRadius: 5, marginTop: 5 }}>
                                                    <div style={{ width: '100%', height: '100%', background: '#12b886', borderRadius: 5 }}></div>
                                                </div>
                                            </Paper>
                                        </Group>
                                    )}
                                </Box>
                            </Tabs.Panel>


                            {/* TAB 3: TRAZABILIDAD (Mantenimientos e Inspecciones) */}
                            <Tabs.Panel value="traceability">
                                <Grid>
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <Group justify="space-between" mb="md">
                                            <Title order={5}>Últimos Mantenimientos</Title>
                                            <Button variant="subtle" size="xs" compact>Ver todo</Button>
                                        </Group>
                                        
                                        {mantenimientos.length > 0 ? (
                                            <Timeline active={0} bulletSize={24} lineWidth={2}>
                                                {mantenimientos.map((mant) => (
                                                    <Timeline.Item key={mant.id} bullet={<IconTool size={12} />} title={mant.tipoMantenimiento}>
                                                        <Text c="dimmed" size="xs">{new Date(mant.fechaInicio).toLocaleDateString()}</Text>
                                                        <Text size="xs" mt={4}>{mant.descripcion || 'Sin descripción'}</Text>
                                                    </Timeline.Item>
                                                ))}
                                            </Timeline>
                                        ) : (
                                            <Alert color="gray" variant="light" title="Sin registros">
                                                No se han registrado mantenimientos recientes.
                                            </Alert>
                                        )}
                                    </Grid.Col>
                                    
                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                        <Title order={5} mb="md">Últimas Inspecciones</Title>
                                        {inspecciones.length > 0 ? (
                                            <Stack gap="xs">
                                                {inspecciones.map((insp) => (
                                                    <Card key={insp.id} withBorder padding="xs" radius="sm">
                                                        <Group justify="space-between">
                                                            <Text size="sm" fw={500}>{insp.tipo || 'Inspección'}</Text>
                                                            <Text size="xs" c="dimmed">{new Date(insp.fecha).toLocaleDateString()}</Text>
                                                        </Group>
                                                        <Badge mt="xs" color={insp.resultado === 'Aprobado' ? 'green' : 'red'} variant="light">
                                                            {insp.resultado}
                                                        </Badge>
                                                    </Card>
                                                ))}
                                            </Stack>
                                        ) : (
                                            <Alert color="gray" variant="light" title="Sin inspecciones">
                                                No hay registros de inspección.
                                            </Alert>
                                        )}
                                    </Grid.Col>
                                </Grid>
                            </Tabs.Panel>
                        </Tabs>
                    </Paper>
                </Grid.Col>
            </Grid>

            {/* Modal Eliminación */}
            <Modal opened={modalDeleteOpened} onClose={() => setModalDeleteOpened(false)} title="Confirmar Eliminación" centered>
                <Text size="sm">
                    ¿Estás seguro de que deseas eliminar permanentemente el activo <b>{activo.codigoInterno}</b>?
                    <br/><br/>
                    <span style={{ color: 'red' }}>⚠️ Esto eliminará también los historiales asociados y liberará los subsistemas.</span>
                </Text>
                <Group justify="flex-end" mt="xl">
                    <Button variant="default" onClick={() => setModalDeleteOpened(false)}>Cancelar</Button>
                    <Button color="red" onClick={handleDelete} loading={loading}>Eliminar Definitivamente</Button>
                </Group>
            </Modal>
        </Container>
    );
}