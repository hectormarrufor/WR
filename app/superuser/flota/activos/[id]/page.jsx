'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Paper, Title, Text, Group, Button, Loader, Alert, Grid, Badge, Divider } from '@mantine/core';
import { IconTool, IconClipboardCheck, IconPencil } from '@tabler/icons-react';
import RenderActivoDetails from '../../../../components/RenderActivoDetails'; // Asegúrate de que la ruta sea correcta

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
                <Badge size="lg" color={activo.estadoOperativo === 'Operativo' ? 'teal' : 'red'}>
                    {activo.estadoOperativo}
                </Badge>
            </Group>
            <Text c="dimmed" mb="xl">Modelo Base: {activo.modelo.nombre}</Text>

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
                <Button leftSection={<IconPencil size={18}/>} size="md" onClick={() => router.push(`/superuser/flota/activos/${id}/editar`)}>
                    Editar Activo
                </Button>
            </Group>
        </Paper>
    );
}