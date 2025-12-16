'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Paper, Title, Text, Group, Button, Loader, Alert, Grid, Badge, Divider, Image, Center, Stack } from '@mantine/core';
import { IconTool, IconClipboardCheck, IconPencil, IconPhotoOff, IconBook } from '@tabler/icons-react';
import HallazgosPendientes from './inspecciones/HallazgosPendientes';
import { useAuth } from '@/hooks/useAuth';

export default function DetalleActivoPage() {
    const { id } = useParams();
    const router = useRouter();
    const [activo, setActivo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { isAdmin } = useAuth();

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsMobile(window.innerWidth <= 768);
        }
    }, []);

    useEffect(() => {
        if (id) {
            const fetchActivo = async () => {
                setLoading(true);
                try {
                    const response = await fetch(`/api/gestionMantenimiento/activos/${id}`);
                    if (!response.ok) throw new Error('Activo no encontrado');
                    const data = await response.json();
                    console.log('Datos del activo:', data);
                    setActivo(data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchActivo();
        }
    }, [id]);

    if (loading) return <Loader size="xl" style={{ display: 'block', margin: 'auto', marginTop: '50px' }} />;
    if (error) return <Alert color="red" title="Error">{error}</Alert>;
    if (!activo) return <Alert color="yellow" title="Aviso">No se encontraron datos para el activo.</Alert>;

    return (
        <Paper>
            <Title order={2}>Detalles del activo {activo.codigoActivo}</Title>
            <Title order={4} mb={20}>Modelo: {activo.modelo.nombre}</Title>


            {/* ✨ SECCIÓN DE DETALLES PRINCIPALES CON IMAGEN ✨ */}
            <Grid gutter="xl">
                <Grid.Col span={{ base: 12, md: 4 }}>
                    {activo.imagen ? (
                        <Image src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${activo.imagen}?${Date.now()}`} radius="md" />
                    ) : (
                        <Paper   radius="md" p="xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Center>
                                <IconPhotoOff size={48} color="var(--mantine-color-gray-5)" />
                                <Text c="dimmed" ml="sm">Sin imagen</Text>
                            </Center>
                        </Paper>
                    )}
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Paper   p="md" radius="md" h="100%">
                        <Group mt="xs">
                            <Title order={4}>Estado Operativo General: </Title>
                            <Badge size="lg" color={activo.estadoOperativo === 'Operativo' ? 'teal' : activo.estadoOperativo === 'Advertencia' ? 'orange' : 'red'}>
                                {activo.estadoOperativo}
                            </Badge>
                        </Group>
                        <Divider my="xs" />
                        <Title order={5} mb="md" align="center">Hallazgos Pendientes:</Title>
                        {/* Le pasamos los hallazgos que ya vienen con el activo */}
                        <HallazgosPendientes hallazgos={activo.hallazgos || []} activoId={activo.id} />
                    </Paper>
                </Grid.Col>
            </Grid>
            <Paper py={20} px={30} my={30} align="center"   radius="md">
                <Title order={4}  p={0}>Acciones Rápidas</Title>
                <Divider my={5} />
                {/* Botones en fila o columna según sea móvil o no */}

                {!isMobile ?

                    <Group justify="space-between" mt="sm" mb="md">
                        <Button leftSection={<IconClipboardCheck size={18} />} size="md" onClick={() => router.push(`${id}/inspecciones/nueva`)}>
                            Realizar Inspección
                        </Button>
                        <Button leftSection={<IconBook size={18} />} size="md" disabled>
                            Historial de Mantenimientos
                        </Button>
                       {isAdmin && <Button leftSection={<IconPencil size={18} />} onClick={() => router.push(`/superuser/flota/activos/${id}/editar`)}>
                            Editar Activo
                        </Button>}
                    </Group>

                    :
                    <Stack mt="xl" mb="md" spacing="md">

                        <Button fullWidth leftSection={<IconClipboardCheck size={18} />} size="md" onClick={() => router.push(`${id}/inspecciones/nueva`)}>
                            Realizar Inspección
                        </Button>
                        <Button fullWidth leftSection={<IconBook size={18} />} size="md" disabled>
                            Historial de Mantenimientos
                        </Button>
                        {isAdmin && <Button fullWidth leftSection={<IconPencil size={18} />} onClick={() => router.push(`/superuser/flota/activos/${id}/editar`)}>
                            Editar Activo
                        </Button>}
                    </Stack>
                }
            </Paper>


            <Paper p="lg"   radius="md" mt={10}>
               <div>
                <Title order={4} mb={20}>Información Detallada del Activo</Title>
               </div>
            </Paper>
        </Paper>
    );
}