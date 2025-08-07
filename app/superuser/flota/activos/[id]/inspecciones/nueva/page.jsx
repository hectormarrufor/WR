'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from '@mantine/form';
import { Paper, Title, Text, Loader, Alert, NumberInput, Group, Button, SegmentedControl, Textarea, Box, Collapse, ActionIcon, TextInput } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconPlus } from '@tabler/icons-react';

export default function NuevaInspeccionPage() {
    const { id: activoId } = useParams();
    const { userId } = useAuth();
    const router = useRouter();
    const [activo, setActivo] = useState(null);
    const [loading, setLoading] = useState(true);

    const form = useForm({
        initialValues: {
            kilometrajeActual: '',
            horometroActual: '',
            observacionesGenerales: '',
            hallazgos: []
        },
        validate: {
            kilometrajeActual: (value) => (value > 0 ? null : 'El kilometraje es requerido'),
        }
    });

    useEffect(() => {
        if (activoId) {
            fetch(`/api/gestionMantenimiento/activos/${activoId}`)
                .then(res => res.json())
                .then(data => {
                    setActivo(data);
                    form.setFieldValue('kilometrajeActual', data.ultimoKilometraje || '');
                    form.setFieldValue('horometroActual', data.ultimoHorometro || '');
                    setLoading(false);
                });
        }
    }, [activoId]);

    const handleSubmit = async (values) => {
        const hallazgosReportados = values.hallazgos.filter(h => h.severidad === 'Advertencia' || h.severidad === 'Critico');
        
        const payload = {
            activoId: parseInt(activoId),
            userId: userId,
            kilometrajeActual: values.kilometrajeActual,
            horometroActual: values.horometroActual,
            observacionesGenerales: values.observacionesGenerales,
            hallazgosReportados
        };
        
        try {
            const response = await fetch('/api/gestionMantenimiento/inspecciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Error al guardar la inspección');
            notifications.show({ title: 'Éxito', message: 'Inspección y hallazgos guardados.', color: 'green' });
            router.push(`/superuser/flota/activos/${activoId}`);
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        }
    };

    const hallazgosFields = form.values.hallazgos.map((item, index) => {
        const severidad = item.severidad || 'Operativo'; // Default to Operativo
        return (
            <Paper withBorder p="md" mt="sm" key={index}>
                <Group justify="space-between" mb="xs">
                    <Text fw={500}>Hallazgo #{index + 1}</Text>
                    <ActionIcon color="red" onClick={() => form.removeListItem('hallazgos', index)}><IconTrash size={16} /></ActionIcon>
                </Group>
                <TextInput
                    placeholder="Descripción del hallazgo (ej: Fuga en manguera de radiador)"
                    required
                    {...form.getInputProps(`hallazgos.${index}.descripcion`)}
                />
                <SegmentedControl
                    fullWidth
                    mt="md"
                    color={severidad === 'Critico' ? 'red' : 'yellow'}
                    value={severidad}
                    onChange={(value) => form.setFieldValue(`hallazgos.${index}.severidad`, value)}
                    data={[
                        { label: 'Advertencia', value: 'Advertencia' },
                        { label: 'Crítico', value: 'Critico' },
                    ]}
                />
                <Collapse in={severidad === 'Advertencia' || severidad === 'Critico'}>
                    <Box mt="xs">
                        {severidad === 'Advertencia' && (
                            <Text size="sm" c="orange" ta="center" p="xs" style={{ border: '1px solid orange', borderRadius: '4px' }}>
                                El activo se puede operar pero con riesgos.
                            </Text>
                        )}
                        {severidad === 'Critico' && (
                            <Text size="sm" c="red" ta="center" p="xs" style={{ border: '1px solid red', borderRadius: '4px' }}>
                                El activo no se puede operar hasta solventar el hallazgo.
                            </Text>
                        )}
                        <Textarea
                            placeholder="Observación detallada del problema (opcional)..."
                            mt="xs"
                            autosize minRows={2}
                            {...form.getInputProps(`hallazgos.${index}.observacionInspector`)}
                        />
                    </Box>
                </Collapse>
            </Paper>
        );
    });

    if (loading) return <Loader />;
    if (!activo) return <Alert color="red">Activo no encontrado</Alert>;

    return (
        <Paper component="form" onSubmit={form.onSubmit(handleSubmit)} withBorder p="xl" mt={30}>
            <Title order={2}>Nueva Inspección (Formato Libre) para: {activo.codigoActivo}</Title>
            <Text c="dimmed">Modelo: {activo.modelo.nombre}</Text>
            <Paper withBorder p="md" mt="xl">
                <Title order={4} mb="md">Lecturas Actuales</Title>
                <Group grow>
                    <NumberInput label="Kilometraje Actual" required {...form.getInputProps('kilometrajeActual')} />
                    <NumberInput label="Horómetro Actual" {...form.getInputProps('horometroActual')} />
                </Group>
            </Paper>
            <Paper withBorder p="md" mt="lg">
                <Title order={4} mb="md">Reporte de Hallazgos</Title>
                {hallazgosFields.length > 0 ? hallazgosFields : <Text c="dimmed" ta="center" p="md">No se han reportado problemas. Haz clic en "Añadir Hallazgo" si encuentras alguno.</Text>}
                <Button 
                    mt="md" 
                    variant="outline" 
                    leftSection={<IconPlus size={16} />} 
                    onClick={() => form.insertListItem('hallazgos', { descripcion: '', severidad: 'Advertencia', observacionInspector: '' })}
                >
                    Añadir Hallazgo
                </Button>
            </Paper>
            <Textarea label="Observaciones Generales de la Inspección" mt="lg" {...form.getInputProps('observacionesGenerales')} />
            <Button type="submit" mt="xl" size="md">Finalizar y Guardar Inspección</Button>
        </Paper>
    );
}