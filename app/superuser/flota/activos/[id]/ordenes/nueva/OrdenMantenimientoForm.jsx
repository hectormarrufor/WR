'use client';
import { useEffect, useState } from 'react';
import { useForm } from '@mantine/form';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Paper, Title, Text, Loader, Select, Button, Group, Textarea, Badge, Box, TextInput, Grid, ActionIcon, Collapse } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import PaddedPaper from '@/app/superuser/flota/components/PaddedPaper';

// --- Sub-componente SugerenciasConsumibles (CON LA CORRECCIÓN) ---
function SugerenciasConsumibles({ activoId, descripcionTarea, onConsumibleSelect }) {
    const [sugerencias, setSugerencias] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (descripcionTarea && descripcionTarea.length > 3) {
            setLoading(true);
            fetch(`/api/gestionMantenimiento/ordenes/sugerir-consumibles?activoId=${activoId}&descripcion=${encodeURIComponent(descripcionTarea)}`)
                .then(res => res.json())
                .then(data => {
                    // ✨ CORRECCIÓN CLAVE: Verificamos si la respuesta es un array.
                    if (Array.isArray(data)) {
                        setSugerencias(data);
                    } else {
                        // Si la API devuelve un error (objeto), lo ignoramos y dejamos las sugerencias vacías.
                        console.error("API de sugerencias no devolvió un array:", data);
                        setSugerencias([]);
                    }
                })
                .catch(error => {
                    console.error("Error en fetch de sugerencias:", error);
                    setSugerencias([]); // En caso de error de red, también vaciamos.
                })
                .finally(() => setLoading(false));
        } else {
            setSugerencias([]);
        }
    }, [descripcionTarea, activoId]);

    if (loading) return <Loader size="xs" my="sm" />;
    // Ya no es posible que `sugerencias` no sea un array, por lo que `map` es seguro.
    if (sugerencias.length === 0) return null;

    return (
        <PaddedPaper>
            <Text fw={500} size="sm">Sugerencias de Repuestos:</Text>
            {sugerencias.map((sug, index) => (
                <Group key={index} grow mt="xs">
                    <Text size="sm">{sug.tarea} (Cant: {sug.cantidadRequerida})</Text>
                    <Select
                        placeholder="Selecciona un consumible en stock"
                        data={sug.opciones.map(op => ({
                            value: op.id.toString(),
                            label: `${op.nombre} (Stock: ${op.stock})`
                        }))}
                        onChange={(consumibleId) => {
                            const selectedOption = sug.opciones.find(op => op.id.toString() === consumibleId);
                            if (selectedOption) {
                                onConsumibleSelect({
                                    consumibleId: selectedOption.id,
                                    nombre: selectedOption.nombre,
                                    cantidad: sug.cantidadRequerida
                                });
                            }
                        }}
                    />
                </Group>
            ))}
        </PaddedPaper>
    );
}

export default function OrdenMantenimientoForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const { nombre, apellido, isAdmin } = useAuth();

    const [hallazgos, setHallazgos] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activoId = params.id;
    const hallazgoIds = searchParams.get('hallazgos')?.split(',');

    const form = useForm({
        initialValues: {
            responsableId: '',
            codigoOM: '',
            estado: 'Planificado',
            prioridad: 'Media',
            fechaInicio: new Date(),
            fechaFin: null,
            descripcion: '',
            tareas: []
        }
    });

    useEffect(() => {
        if (!hallazgoIds || !activoId) {
            notifications.show({ title: 'Error', message: 'No se seleccionaron hallazgos o falta el ID del activo.', color: 'red' });
            router.back();
            return;
        }

        const fetchData = async () => {
            if (hallazgos.length > 0) return; // Ya cargados
            // if (hallazgos.length > 0) return; // Ya cargados
            try {
                const [hallazgosRes, empleadosRes] = await Promise.all([
                    fetch(`/api/gestionMantenimiento/hallazgos?ids=${hallazgoIds.join(',')}`),
                    fetch('/api/rrhh/empleados')
                ]);
                const hallazgosData = await hallazgosRes.json();
                const empleadosData = await empleadosRes.json();

                setHallazgos(hallazgosData);
                setEmpleados(empleadosData.map(e => ({ value: e.id.toString(), label: `${e.nombre} ${e.apellido}` })));

                const descripciones = hallazgosData.map(h => h.descripcion).join('; ');
                form.setFieldValue('descripcion', `Atender los siguientes hallazgos: ${descripciones}.`);

            } catch (error) {
                notifications.show({ title: 'Error', message: 'No se pudieron cargar los datos necesarios.', color: 'red' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [activoId, hallazgoIds, router]);

    const handleSubmit = async (values) => {
        setIsSubmitting(true);
        const payload = {
            ...values,
            activoId: parseInt(activoId),
            hallazgoIds: hallazgoIds.map(id => parseInt(id)),
            userId: user.userId, // Añadimos el ID del usuario que crea la orden
        };
        try {
            const response = await fetch('/api/gestionMantenimiento/ordenes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error((await response.json()).message);
            notifications.show({ title: 'Éxito', message: 'Orden de Mantenimiento creada correctamente.', color: 'green' });
            router.push(`/superuser/flota/activos/${activoId}`);
            router.refresh();
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const tareasFields = form.values.tareas.map((tarea, index) => (
        <Paper withBorder p="sm" mt="md" key={index}>
            <Group justify="space-between">
                <Text fw={500}>Tarea #{index + 1}</Text>
                <ActionIcon color="red" onClick={() => form.removeListItem('tareas', index)}><IconTrash size={16} /></ActionIcon>
            </Group>
            <TextInput label="Descripción de la Tarea" required {...form.getInputProps(`tareas.${index}.descripcion`)} />
            <Select label="Asignar a Técnico" data={empleados} searchable clearable mt="sm" {...form.getInputProps(`tareas.${index}.tecnicoId`)} />

            <SugerenciasConsumibles
                activoId={activoId}
                descripcionTarea={tarea.descripcion}
                onConsumibleSelect={(consumible) => {
                    const currentConsumibles = form.values.tareas[index].consumibles || [];
                    form.setFieldValue(`tareas.${index}.consumibles`, [...currentConsumibles, consumible]);
                }}
            />
            {(tarea.consumibles && tarea.consumibles.length > 0) && (
                <Box mt="sm" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                    <Text size="sm" fw={500}>Repuestos Solicitados para esta Tarea:</Text>
                    {tarea.consumibles.map((cons, consIndex) => (
                        <Paper withBorder p="xs" radius="sm" mt={5} key={cons.consumibleId}>
                            <Group justify="space-between">
                                <Text size="sm">{cons.nombre} (Cant: {cons.cantidad})</Text>
                                <ActionIcon
                                    color="red"
                                    size="xs"
                                    variant="subtle"
                                    onClick={() => {
                                        const updatedConsumibles = tarea.consumibles.filter((_, i) => i !== consIndex);
                                        form.setFieldValue(`tareas.${index}.consumibles`, updatedConsumibles);
                                    }}
                                >
                                    <IconTrash size={14} />
                                </ActionIcon>
                            </Group>
                        </Paper>
                    ))}
                </Box>
            )}
        </Paper>
    ));

    if (loading) return <Loader />;

    return (
        <Paper component="form" onSubmit={form.onSubmit(handleSubmit)} p='sm'>
            <Paper>
                <Title order={4} mb="md">Hallazgos Seleccionados:</Title>
                <Box mb="lg">
                    {hallazgos.map(h => <Text key={h.id}>• {h.descripcion} (<Badge color={h.severidad === 'Critico' ? 'red' : 'yellow'} size="sm">{h.severidad}</Badge>)</Text>)}
                </Box>
            </Paper>

            <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput label="Creada por" value={`${nombre || ''} ${apellido || ''}`} readOnly />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput label="Código de Orden (Opcional)" placeholder="Se generará automáticamente si se deja vacío" {...form.getInputProps('codigoOM')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select label="Responsable de la Orden" placeholder="Seleccione un supervisor" data={empleados} searchable required {...form.getInputProps('responsableId')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select label="Prioridad" data={['Baja', 'Media', 'Alta', 'Urgente']} required {...form.getInputProps('prioridad')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <DateInput label="Fecha de Inicio Planificada" valueFormat="DD/MM/YYYY" {...form.getInputProps('fechaInicio')} />
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                    <DateInput label="Fecha de Fin Planificada" valueFormat="DD/MM/YYYY" {...form.getInputProps('fechaFin')} />
                </Grid.Col>
            </Grid>

            <Textarea label="Descripción General de la Orden" mt="md" autosize minRows={3} required {...form.getInputProps('descripcion')} />

            <Box mt="xl">
                <Title order={4}>Plan de Tareas</Title>
                {tareasFields}
                <Button
                    mt="md"
                    variant="outline"
                    leftSection={<IconPlus size={16} />}
                    onClick={() => form.insertListItem('tareas', { descripcion: '', tecnicoId: null, consumibles: [] })}
                >
                    Añadir Tarea
                </Button>
            </Box>

            <Button type="submit" mt="xl" size="md" loading={isSubmitting}>Confirmar y Crear Orden</Button>
        </Paper>
    );
}