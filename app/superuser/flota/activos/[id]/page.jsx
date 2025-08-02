'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Paper, Title, Text, Group, Button, Loader, Alert, Grid, Badge, Divider, Image, Center } from '@mantine/core';
import { IconTool, IconClipboardCheck, IconPencil, IconPhotoOff } from '@tabler/icons-react';
import RenderActivoDetails from '../components/RenderActivoDetails';

export default function DetalleActivoPage() {
    const { id } = useParams();
    const router = useRouter();
    const [activo, setActivo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
        <Paper withBorder shadow="md" p="xl" radius="md" mt={30}>
            <Group justify="space-between" mb="md">
                <Title order={2}>Ficha Técnica: {activo.codigoActivo}</Title>
                <Button leftSection={<IconPencil size={18}/>} onClick={() => router.push(`/superuser/flota/activos/${id}/editar`)}>
                    Editar Activo
                </Button>
            </Group>
            {/* <Text c="dimmed" mb="xl">Modelo Base: {activo.modelo.nombre}</Text> */}

            {/* ✨ SECCIÓN DE DETALLES PRINCIPALES CON IMAGEN ✨ */}
            <Grid gutter="xl">
                <Grid.Col span={{ base: 12, md: 4 }}>
                    {activo.imagen ? (
                        <Image src={activo.imagen} radius="md" />
                    ) : (
                        <Paper withBorder radius="md" p="xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                           <Center>
                             <IconPhotoOff size={48} color="var(--mantine-color-gray-5)" />
                             <Text c="dimmed" ml="sm">Sin imagen</Text>
                           </Center>
                        </Paper>
                    )}
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Paper withBorder p="md" radius="md" h="100%">
                        <Title order={4}>Información General</Title>
                        <Divider my="xs" />
                        <Group justify="space-between" mt="md">
                            <Text fw={500}>Código de Activo:</Text>
                            <Text>{activo.codigoActivo}</Text>
                        </Group>
                         <Group justify="space-between" mt="xs">
                            <Text fw={500}>Modelo:</Text>
                            <Text>{activo.modelo.nombre}</Text>
                        </Group>
                        <Group justify="space-between" mt="xs">
                            <Text fw={500}>Estado Operativo:</Text>
                            <Badge size="lg" color={activo.estadoOperativo === 'Operativo' ? 'teal' : 'red'}>
                                {activo.estadoOperativo}
                            </Badge>
                        </Group>
                    </Paper>
                </Grid.Col>
            </Grid>
            
            <Divider my="xl" label="Especificaciones Técnicas" labelPosition="center" />

            <Paper p="lg" withBorder radius="md">
                 <RenderActivoDetails 
                    schema={Object.values(activo.modelo.especificaciones)}
                    data={activo.datosPersonalizados}
                />
            </Paper>

            <Divider my="xl" label="Acciones de Mantenimiento" labelPosition="center" />
            <Group justify="center">
                <Button leftSection={<IconClipboardCheck size={18}/>} variant="outline" size="md" disabled>
                    Realizar Inspección
                </Button>
                <Button leftSection={<IconTool size={18}/>} variant="outline" size="md" disabled>
                    Ver Mantenimientos
                </Button>
            </Group>
        </Paper>
    );
}